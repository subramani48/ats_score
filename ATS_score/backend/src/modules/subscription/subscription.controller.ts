import { Controller, Get, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly service: SubscriptionService) {}

  @Get('tier')
  getTierInfo(@CurrentUser() user: AuthUser) {
    return this.service.getTierInfo(user.id);
  }

  // Blocked for everyone until a real payment step exists. This route used to let any logged-in
  // user set their own tier for free. When payments are added, upgrades must come from a verified
  // payment (for example a signed webhook), never from a request the user can send themselves.
  // Until then an admin changes plans with PATCH /admin/users/:id/tier.
  @Post('upgrade')
  upgradeTier() {
    throw new ForbiddenException('Online payment is not available yet. Please contact the site administrator to change your plan.');
  }
}
