import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto, FollowUpDto, UpdateApplicationDto } from './dto/applications.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  @Post()
  create(@Body() dto: CreateApplicationDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.service.list(user.id, status);
  }

  // Declared before ':id' routes so "stats" is never treated as an id.
  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.service.stats(user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateApplicationDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id);
  }

  @Post(':id/follow-up')
  @HttpCode(HttpStatus.OK)
  followUp(@Param('id') id: string, @Body() dto: FollowUpDto, @CurrentUser() user: AuthUser) {
    return this.service.followUp(id, dto, user.id);
  }
}
