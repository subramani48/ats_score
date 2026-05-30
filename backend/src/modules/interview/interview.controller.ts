import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { GenerateInterviewDto } from './dto/generate-interview.dto';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('interview')
export class InterviewController {
  constructor(private readonly service: InterviewService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalAuthGuard)
  generate(@Body() dto: GenerateInterviewDto, @CurrentUser() user: AuthUser | null) {
    return this.service.generate(dto, user?.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@CurrentUser() user: AuthUser) {
    return this.service.getUserHistory(user.id);
  }
}
