import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AnalysisService } from './analysis.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AI_CHAT_FAILED_MESSAGE, chatFailureMessage, resolveAiTimeoutMs, withTimeout } from '../ai/ai-timeout';

@Controller('analyses')
export class AnalysisController {
  private readonly logger = new Logger(AnalysisController.name);

  constructor(private readonly analysisService: AnalysisService) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getUserHistory(@CurrentUser() user: AuthUser) {
    return this.analysisService.findByUserId(user.id);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  getUserAnalytics(@CurrentUser() user: AuthUser) {
    return this.analysisService.getUserAnalytics(user.id);
  }

  @Get('compare')
  @UseGuards(JwtAuthGuard)
  compareAnalyses(@Query('ids') ids: string, @CurrentUser() user: AuthUser) {
    const idList = (ids ?? '').split(',').filter(Boolean);
    return this.analysisService.compareAnalyses(idList, user.id);
  }

  /** Peer benchmarking — compare your score against everyone in the same domain */
  @Get('benchmark')
  getPeerBenchmark(
    @Query('domain') domain: string,
    @Query('score') score: string,
  ) {
    return this.analysisService.getPeerBenchmark(domain ?? '', Number(score ?? 0));
  }

  // The routes below return or use the resume text inside an analysis, so they need login and only
  // work for the analysis owner. Signed-out uploaders never need them: the finished job already sends
  // their full result to the page.
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.analysisService.findById(id, user.id);
  }

  @Get(':id/keyword-gap')
  @UseGuards(JwtAuthGuard)
  getKeywordGap(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.analysisService.getKeywordGap(id, user.id);
  }

  @Post(':id/chat')
  @UseGuards(JwtAuthGuard)
  async chatWithAI(
    @Param('id') id: string,
    @Body() dto: ChatDto,
    @Res() res: Response,
    @CurrentUser() user: AuthUser,
  ) {
    const { chat } = await this.analysisService.startChatSession(id, user.id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Once the stream has started the status code is already sent, so a failure cannot become a normal error
    // response. It is caught HERE, reported to the client inside the stream, and never rethrown: rethrowing sent
    // it to the global error handler, which wrote to the already-finished response and crashed the whole server.
    // The response is finished exactly once, and nothing is written after it has finished.
    const canWrite = () => !res.writableEnded && !res.destroyed;
    // Every wait on the AI has a limit, so a stuck AI cannot keep this connection open forever.
    const limitMs = resolveAiTimeoutMs(process.env.GEMINI_TIMEOUT_MS);
    let iterator: AsyncIterator<{ text(): string }> | undefined;
    let wroteText = false;
    try {
      const streamResult = await withTimeout(chat.sendMessageStream(dto.message), limitMs);
      iterator = (streamResult.stream as AsyncIterable<{ text(): string }>)[Symbol.asyncIterator]();
      while (true) {
        const { value: chunk, done } = await withTimeout(iterator.next(), limitMs);
        if (done) break;
        if (!canWrite()) break;   // the client went away
        const text = chunk.text();
        if (!text) continue;      // the AI sometimes sends an empty piece; there is nothing to show for it
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
        wroteText = true;
      }
      if (canWrite()) {
        if (!wroteText) {
          // An answer with no text at all must not look like a success, or the user just sees a blank reply.
          this.logger.warn('Chat AI returned no text');
          res.write(`event: error\ndata: ${JSON.stringify({ message: AI_CHAT_FAILED_MESSAGE })}\n\n`);
        } else {
          await this.warnIfCutOff(streamResult.response, limitMs);
        }
      }
    } catch (err) {
      this.logger.warn(`Chat AI call failed: ${err instanceof Error ? err.message : String(err)}`);
      if (canWrite()) {
        res.write(`event: error\ndata: ${JSON.stringify({ message: chatFailureMessage(err) })}\n\n`);
      }
    } finally {
      // Stop reading a stream we no longer need (best effort; never waits, never throws).
      void Promise.resolve(iterator?.return?.()).catch(() => undefined);
      if (canWrite()) {
        res.write('event: done\ndata: {}\n\n');
        res.end();
      }
    }
  }
  /** Logs (never shows) when the AI stopped only because it hit the output limit, so a too-small limit is noticed. */
  private async warnIfCutOff(response: unknown, limitMs: number) {
    try {
      const done = await withTimeout(Promise.resolve(response), limitMs) as
        { candidates?: Array<{ finishReason?: string }> } | undefined;
      if (done?.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        this.logger.warn('Chat answer stopped at the output token limit (MAX_TOKENS); consider raising the limit');
      }
    } catch { /* the final summary is optional; the text was already sent */ }
  }
}
