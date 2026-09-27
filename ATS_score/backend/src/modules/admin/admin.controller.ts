import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { AdminService } from './admin.service';
import { JwtOnlyAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { TIERS, type Tier } from '../subscription/subscription.service';

class SetTierDto {
  @IsIn(TIERS)
  tier!: Tier;
}

@Controller('admin')
@UseGuards(JwtOnlyAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('stats')
  getStats() {
    return this.service.getPlatformStats();
  }

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.service.getUsers(Number(page ?? 1), Number(limit ?? 20), q);
  }

  // There are no payments yet, so an admin changes a user's plan by hand (for example after being paid
  // outside the app). This is the only way a plan changes.
  @Patch('users/:id/tier')
  setUserTier(@Param('id') id: string, @Body() body: SetTierDto, @CurrentUser() admin: AuthUser) {
    return this.service.setUserTier(id, body.tier, admin.id);
  }
}
