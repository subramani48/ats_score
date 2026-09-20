import request from 'supertest';
import { Test } from '@nestjs/testing';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from '../modules/auth/auth.controller';
import { AuthService } from '../modules/auth/auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

// Fix 12 (and Fix 3): the login/signup limits, checked over real HTTP against a small Nest app that uses the real
// AuthController, the real limiter library, the real error filter, and the same limiter settings as app.module.ts.
const MESSAGE = 'Too many requests. Please wait a few minutes and try again.';
const fakeAuth = { register: async () => ({ success: true }), login: async () => ({ success: true }), getMe: async () => ({ success: true }) };
const loginBody = { email: 'a@b.co', password: 'pw' };
const registerBody = { email: 'a@b.co', password: 'secret1' };

const start = async (hops = 0): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 15 * 60 * 1000, limit: 100 }], errorMessage: MESSAGE })],
    controllers: [AuthController],
    providers: [
      { provide: AuthService, useValue: fakeAuth },
      { provide: APP_GUARD, useClass: ThrottlerGuard },
      { provide: APP_FILTER, useClass: HttpExceptionFilter },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: (ctx: ExecutionContext) => { ctx.switchToHttp().getRequest().user = { id: 'u1', email: 'e@x.co' }; return true; } })
    .compile();
  const app = moduleRef.createNestApplication();
  if (hops > 0) app.getHttpAdapter().getInstance().set('trust proxy', hops);   // the same rule as main.ts
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.init();
  return app;
};

const login = (app: INestApplication, xff?: string) => {
  const r = request(app.getHttpServer()).post('/api/v1/users/login');
  return (xff ? r.set('X-Forwarded-For', xff) : r).send(loginBody);
};
const register = (app: INestApplication) => request(app.getHttpServer()).post('/api/v1/users/register').send(registerBody);
const statuses = async (n: number, fn: (i: number) => Promise<{ status: number }>) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((await fn(i)).status);
  return out;
};

describe('login and signup limits (real HTTP)', () => {
  let app: INestApplication;
  afterEach(async () => { await app?.close(); });

  it('allows 10 login attempts per 15 minutes, then answers 429 with the friendly message', async () => {
    app = await start();
    const results = await statuses(11, () => login(app));
    expect(results.slice(0, 10).every(s => s === 200)).toBe(true);
    expect(results[10]).toBe(429);
    const blocked = await login(app);
    expect(blocked.body.error.message).toBe(MESSAGE);   // the format the login page reads
  });

  it('allows 5 signups per hour, then 429; login and signup are counted separately', async () => {
    app = await start();
    const results = await statuses(6, () => register(app));
    expect(results.slice(0, 5).every(s => s === 201)).toBe(true);
    expect(results[5]).toBe(429);
    expect((await login(app)).status).toBe(200);   // signup being blocked does not block login
  });

  it('keeps the generous site-wide limit on an ordinary route', async () => {
    app = await start();
    const results = await statuses(30, () => request(app.getHttpServer()).get('/api/v1/users/me'));
    expect(results.every(s => s === 200)).toBe(true);
  });

  it('still validates input (bad email, short password, unknown field)', async () => {
    app = await start();
    const http = () => request(app.getHttpServer());
    expect((await http().post('/api/v1/users/login').send({ email: 'nope', password: 'x' })).status).toBe(400);
    expect((await http().post('/api/v1/users/register').send({ email: 'a@b.co', password: '123' })).status).toBe(400);
    expect((await http().post('/api/v1/users/login').send({ ...loginBody, extra: 1 })).status).toBe(400);
  });

  describe('behind a proxy', () => {
    it('with TRUST_PROXY_HOPS unset, different people share ONE budget (the risk to avoid on Render)', async () => {
      app = await start(0);
      const results = await statuses(11, i => login(app, `198.51.100.${i + 1}`));
      expect(results[9]).toBe(200);
      expect(results[10]).toBe(429);
    });

    it('with TRUST_PROXY_HOPS=1, each person has their own budget', async () => {
      app = await start(1);
      const a = await statuses(11, () => login(app, '198.51.100.10'));
      expect(a[10]).toBe(429);
      expect((await login(app, '198.51.100.11')).status).toBe(200);   // person B is not affected by person A
    });

    it('with TRUST_PROXY_HOPS=1, inventing a different fake address each time does not dodge the limit', async () => {
      app = await start(1);
      const results = await statuses(11, i => login(app, `FAKE${i}, 203.0.113.50`));
      expect(results[10]).toBe(429);
    });
  });
});
