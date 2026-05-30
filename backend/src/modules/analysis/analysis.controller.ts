import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AnalysisService } from './analysis.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('analyses')
export class AnalysisController {
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
  compareAnalyses(@Query('ids') ids: string) {
    const idList = (ids ?? '').split(',').filter(Boolean);
    return this.analysisService.compareAnalyses(idList);
  }

  /** Peer benchmarking — compare your score against everyone in the same domain */
  @Get('benchmark')
  getPeerBenchmark(
    @Query('domain') domain: string,
    @Query('score') score: string,
  ) {
    return this.analysisService.getPeerBenchmark(domain ?? '', Number(score ?? 0));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.analysisService.findById(id);
  }

  @Get(':id/keyword-gap')
  getKeywordGap(@Param('id') id: string) {
    return this.analysisService.getKeywordGap(id);
  }

  @Post(':id/chat')
  async chatWithAI(
    @Param('id') id: string,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    const { chat } = await this.analysisService.startChatSession(id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const streamResult = await chat.sendMessageStream(dto.message);
      const chunks = await streamResult.stream;
      for await (const chunk of chunks) {
        res.write(`data: ${JSON.stringify({ text: chunk.text() })}\n\n`);
      }
    } finally {
      res.write('event: done\ndata: {}\n\n');
      res.end();
    }
  }
}
