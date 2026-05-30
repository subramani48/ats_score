import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { SubscriptionService, type Tier } from './subscription.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class UpgradeTierDto {
  @IsString()
  tier!: string;
}

@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly service: SubscriptionService) {}

  @Get('tier')
  getTierInfo(@CurrentUser() user: AuthUser) {
    return this.service.getTierInfo(user.id);
  }

  @Post('upgrade')
  upgradeTier(@CurrentUser() user: AuthUser, @Body() dto: UpgradeTierDto) {
    // In production: validate Stripe payment first
    return this.service.upgradeTier(user.id, dto.tier as Tier);
  }
}
