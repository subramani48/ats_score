import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BatchService } from './batch.service';
import { BatchAnalyzeDto } from './dto/batch-analyze.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('batch')
export class BatchController {
  constructor(
    private readonly service: BatchService,
    private readonly subscription: SubscriptionService,
  ) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  // Login required (this uses AI quota). The limit of 5 per hour is unchanged.
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60 * 60 * 1000, limit: 5 } })
  async analyze(@Body() dto: BatchAnalyzeDto, @CurrentUser() user: AuthUser) {
    // Plan limit: how many job descriptions one batch may contain
    await this.subscription.checkLimit(user.id, 'batchJDsPerRun', dto.jobDescriptions.length);
    return this.service.analyze(dto, user.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@CurrentUser() user: AuthUser) {
    return this.service.getUserBatchJobs(user.id);
  }
}
