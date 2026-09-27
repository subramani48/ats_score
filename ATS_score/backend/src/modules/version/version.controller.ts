import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { VersionService } from './version.service';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('versions')
@UseGuards(JwtAuthGuard)
export class VersionController {
  constructor(private readonly service: VersionService) {}

  @Get('resume/:resumeId')
  getVersions(@Param('resumeId') resumeId: string, @CurrentUser() user: AuthUser) {
    return this.service.getVersions(resumeId, user.id);
  }

  @Post('resume/:resumeId/snapshot')
  createSnapshot(
    @Param('resumeId') resumeId: string,
    @Body() body: CreateSnapshotDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createVersion(resumeId, user.id, body.label, body.score, body.domain);
  }

  @Get('compare')
  compare(@Query('ids') ids: string, @CurrentUser() user: AuthUser) {
    const idList = (ids ?? '').split(',').filter(Boolean);
    return this.service.compareVersions(idList, user.id);
  }
}
