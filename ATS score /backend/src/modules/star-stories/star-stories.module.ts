import { Module } from '@nestjs/common';
import { StarStoriesController } from './star-stories.controller';
import { StarStoriesService } from './star-stories.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [StarStoriesController],
  providers: [StarStoriesService],
})
export class StarStoriesModule {}
