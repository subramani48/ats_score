import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InterviewService } from './interview.service';
import { GenerateInterviewDto } from './dto/generate-interview.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('interview')
export class InterviewController {
  constructor(
    private readonly service: InterviewService,
    private readonly subscription: SubscriptionService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  // Login required (this uses AI quota), and limited to 20 per 15 minutes per visitor.
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 20 } })
  async generate(@Body() dto: GenerateInterviewDto, @CurrentUser() user: AuthUser) {
    await this.subscription.checkLimit(user.id, 'interviewsPerMonth');
    return this.service.generate(dto, user.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@CurrentUser() user: AuthUser) {
    return this.service.getUserHistory(user.id);
  }
}
