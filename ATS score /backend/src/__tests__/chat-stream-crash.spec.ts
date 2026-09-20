import 'reflect-metadata';
import { ArgumentsHost, BadRequestException, INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import compression from 'compression';
import request from 'supertest';
import { fakeRes } from './helpers/ai-test-helpers';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AnalysisController } from '../modules/analysis/analysis.controller';
import { AnalysisService } from '../modules/analysis/analysis.service';

// Regression tests for the "write after end" crash: when the AI failed in the middle of a chat stream, the error
// reached the global filter AFTER the response was finished, the filter wrote to it again, and the whole server stopped.

const hostFor = (res: ReturnType<typeof fakeRes>): ArgumentsHost =>
  ({ switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({ method: 'POST', url: '/api/v1/analyses/a1/chat' }) }) }) as unknown as ArgumentsHost;

describe('HttpExceptionFilter — finished responses', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('writes nothing and does not end again when the response is already finished', () => {
    const res = fakeRes({ headersSent: true, contentType: 'text/event-stream' });
    res.writableEnded = true;
    new HttpExceptionFilter().catch(new Error('AI exploded'), hostFor(res));
    expect(res.frames).toEqual([]);
    expect(res.endCalls).toBe(0);
    expect(res.statusCode).toBeUndefined();
    expect(res.body).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('writes nothing when the client already disconnected (destroyed)', () => {
    const res = fakeRes({ headersSent: true, contentType: 'text/event-stream' });
    res.destroyed = true;
    new HttpExceptionFilter().catch(new Error('AI exploded'), hostFor(res));
    expect(res.frames).toEqual([]);
    expect(res.endCalls).toBe(0);
  });

  it('does not try to send JSON on a finished normal response either', () => {
    const res = fakeRes();
    res.writableEnded = true;
    new HttpExceptionFilter().catch(new BadRequestException('nope'), hostFor(res));
    expect(res.statusCode).toBeUndefined();
    expect(res.body).toBeUndefined();
  });

  it('still sends one error frame and ends once on an open stream', () => {
    const res = fakeRes({ headersSent: true, contentType: 'text/event-stream' });
    new HttpExceptionFilter().catch(new Error('late failure'), hostFor(res));
    expect(res.frames).toHaveLength(1);
    expect(res.frames[0]).toContain('event: error');
    expect(res.endCalls).toBe(1);
    expect(res.writeAfterEnd).toBe(0);
  });

  it('still returns the normal JSON error for an ordinary request', () => {
    const res = fakeRes();
    new HttpExceptionFilter().catch(new BadRequestException('bad input'), hostFor(res));
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: { message: 'bad input' } });
  });
});

describe('AnalysisController.chatWithAI — AI failure', () => {
  const user = { id: 'u1', email: 'sandbox@example.com' };
  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined); });
  afterEach(() => jest.restoreAllMocks());

  const controllerWith = (chat: unknown) =>
    new AnalysisController({ startChatSession: jest.fn().mockResolvedValue({ chat }) } as unknown as AnalysisService);

  it('does not throw, reports the error inside the stream, and closes the response exactly once', async () => {
    const res = fakeRes();
    const chat = { sendMessageStream: jest.fn().mockRejectedValue(new Error('[GoogleGenerativeAI Error] 404 model not found')) };
    await expect(controllerWith(chat).chatWithAI('a1', { message: 'hi' }, res as never, user)).resolves.toBeUndefined();
    expect(res.endCalls).toBe(1);
    expect(res.writeAfterEnd).toBe(0);
    expect(res.frames.join('')).toContain('event: error');
    expect(res.frames[res.frames.length - 1]).toContain('event: done');
    expect(warn).toHaveBeenCalled();
  });

  it('does not leak the raw AI error text to the client', async () => {
    const res = fakeRes();
    const chat = { sendMessageStream: jest.fn().mockRejectedValue(new Error('secret-detail key=AIza-FAKE')) };
    await controllerWith(chat).chatWithAI('a1', { message: 'hi' }, res as never, user);
    expect(res.frames.join('')).not.toContain('secret-detail');
    expect(res.frames.join('')).not.toContain('AIza-FAKE');
  });

  it('handles a failure half-way through the stream (some text already sent)', async () => {
    const res = fakeRes();
    async function* chunks() {
      yield { text: () => 'Hello' };
      throw new Error('connection reset');
    }
    const chat = { sendMessageStream: jest.fn().mockResolvedValue({ stream: chunks() }) };
    await controllerWith(chat).chatWithAI('a1', { message: 'hi' }, res as never, user);
    const all = res.frames.join('');
    expect(all).toContain('"text":"Hello"');
    expect(all).toContain('event: error');
    expect(res.endCalls).toBe(1);
    expect(res.writeAfterEnd).toBe(0);
  });

  it('a normal successful answer still streams text then done, closed once', async () => {
    const res = fakeRes();
    async function* chunks() { yield { text: () => 'A' }; yield { text: () => 'B' }; }
    const chat = { sendMessageStream: jest.fn().mockResolvedValue({ stream: chunks() }) };
    await controllerWith(chat).chatWithAI('a1', { message: 'hi' }, res as never, user);
    expect(res.frames).toEqual([
      'data: {"text":"A"}\n\n',
      'data: {"text":"B"}\n\n',
      'event: done\ndata: {}\n\n',
    ]);
    expect(res.endCalls).toBe(1);
  });

  it('stops writing when the client disconnects mid-stream', async () => {
    const res = fakeRes();
    async function* chunks() {
      yield { text: () => 'A' };
      res.destroyed = true;
      yield { text: () => 'B' };
    }
    const chat = { sendMessageStream: jest.fn().mockResolvedValue({ stream: chunks() }) };
    await controllerWith(chat).chatWithAI('a1', { message: 'hi' }, res as never, user);
    expect(res.frames.join('')).not.toContain('"B"');
    expect(res.endCalls).toBe(0);
    expect(res.writeAfterEnd).toBe(0);
  });

  it('an ownership failure (before streaming starts) is still thrown so the normal JSON 404 is used', async () => {
    const res = fakeRes();
    const controller = new AnalysisController({
      startChatSession: jest.fn().mockRejectedValue(new BadRequestException('Analysis not found')),
    } as unknown as AnalysisService);
    await expect(controller.chatWithAI('a1', { message: 'hi' }, res as never, user)).rejects.toThrow('Analysis not found');
    expect(res.headersSent).toBe(false);
    expect(res.frames).toEqual([]);
  });
});

describe('chat route end-to-end (real Nest app, real filter, compression on) — AI fails', () => {
  let app: INestApplication;
  let uncaught: Error[];
  const onUncaught = (e: Error) => { uncaught.push(e); };

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const stub = {
      startChatSession: jest.fn().mockResolvedValue({
        chat: { sendMessageStream: jest.fn().mockRejectedValue(new Error('AI is down')) },
      }),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [AnalysisController],
      providers: [{ provide: AnalysisService, useValue: stub }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (ctx: any) => { ctx.switchToHttp().getRequest().user = { id: 'u1', email: 'x@example.com' }; return true; } })
      .compile();
    app = moduleRef.createNestApplication();
    app.use(compression());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    await app.listen(0);
  });

  afterAll(async () => { await app.close(); jest.restoreAllMocks(); });
  beforeEach(() => { uncaught = []; process.on('uncaughtException', onUncaught); });
  afterEach(() => { process.off('uncaughtException', onUncaught); });

  it('answers with an error frame + done, raises no uncaught exception, and keeps serving requests', async () => {
    const server = app.getHttpServer();
    const res = await request(server).post('/analyses/a1/chat').send({ message: 'hello' });
    expect(res.status).toBe(201);   // Nest's default for POST; the stream's status was sent before the failure
    expect(res.text).toContain('event: error');
    expect(res.text).toContain('event: done');

    await new Promise(r => setTimeout(r, 200));   // the old crash surfaced a moment after the response
    expect(uncaught).toEqual([]);

    const again = await request(server).post('/analyses/a1/chat').send({ message: 'again' });
    expect(again.status).toBe(201);
    expect(again.text).toContain('event: error');
    await new Promise(r => setTimeout(r, 200));
    expect(uncaught).toEqual([]);
  });
});
