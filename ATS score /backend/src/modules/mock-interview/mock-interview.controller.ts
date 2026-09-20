import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { MockInterviewService } from './mock-interview.service';
import { StartMockInterviewDto, SubmitAnswerDto } from './dto/mock-interview.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('mock-interviews')
@UseGuards(JwtAuthGuard)
export class MockInterviewController {
  constructor(private readonly service: MockInterviewService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  start(@Body() dto: StartMockInterviewDto, @CurrentUser() user: AuthUser) {
    return this.service.start(dto, user.id);
  }

  @Get()
  history(@CurrentUser() user: AuthUser) {
    return this.service.history(user.id);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.get(id, user.id);
  }

  @Post(':id/answer')
  @HttpCode(HttpStatus.OK)
  answer(@Param('id') id: string, @Body() dto: SubmitAnswerDto, @CurrentUser() user: AuthUser) {
    return this.service.answer(id, dto, user.id);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  finish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.finish(id, user.id);
  }
}
