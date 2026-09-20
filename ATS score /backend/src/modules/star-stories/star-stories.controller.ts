import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { StarStoriesService } from './star-stories.service';
import { GenerateStoriesDto, MatchStoryDto, UpdateStoryDto } from './dto/star-stories.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('star-stories')
@UseGuards(JwtAuthGuard)
export class StarStoriesController {
  constructor(private readonly service: StarStoriesService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  generate(@Body() dto: GenerateStoriesDto, @CurrentUser() user: AuthUser) {
    return this.service.generate(dto, user.id);
  }

  @Post('match')
  @HttpCode(HttpStatus.OK)
  match(@Body() dto: MatchStoryDto, @CurrentUser() user: AuthUser) {
    return this.service.match(dto, user.id);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStoryDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id);
  }
}
