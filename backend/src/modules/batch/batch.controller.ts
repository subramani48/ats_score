import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BatchService } from './batch.service';
import { BatchAnalyzeDto } from './dto/batch-analyze.dto';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('batch')
export class BatchController {
  constructor(private readonly service: BatchService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalAuthGuard)
  @Throttle({ upload: { ttl: 60 * 60 * 1000, limit: 5 } })
  analyze(@Body() dto: BatchAnalyzeDto, @CurrentUser() user: AuthUser | null) {
    return this.service.analyze(dto, user?.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@CurrentUser() user: AuthUser) {
    return this.service.getUserBatchJobs(user.id);
  }
}
