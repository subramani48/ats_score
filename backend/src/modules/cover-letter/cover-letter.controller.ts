import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import { GenerateCoverLetterDto } from './dto/generate-cover-letter.dto';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('cover-letters')
export class CoverLetterController {
  constructor(private readonly service: CoverLetterService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalAuthGuard)
  generate(@Body() dto: GenerateCoverLetterDto, @CurrentUser() user: AuthUser | null) {
    return this.service.generate(dto, user?.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@CurrentUser() user: AuthUser) {
    return this.service.getUserHistory(user.id);
  }
}
