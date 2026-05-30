import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { VersionService } from './version.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('versions')
@UseGuards(JwtAuthGuard)
export class VersionController {
  constructor(private readonly service: VersionService) {}

  @Get('resume/:resumeId')
  getVersions(@Param('resumeId') resumeId: string) {
    return this.service.getVersions(resumeId);
  }

  @Post('resume/:resumeId/snapshot')
  createSnapshot(
    @Param('resumeId') resumeId: string,
    @Body() body: { label?: string; score?: number; domain?: string },
  ) {
    return this.service.createVersion(resumeId, body.label, body.score, body.domain);
  }

  @Get('compare')
  compare(@Query('ids') ids: string) {
    const idList = (ids ?? '').split(',').filter(Boolean);
    return this.service.compareVersions(idList);
  }
}
