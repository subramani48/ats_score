import { Module } from '@nestjs/common';
import { MockInterviewController } from './mock-interview.controller';
import { MockInterviewService } from './mock-interview.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [MockInterviewController],
  providers: [MockInterviewService],
})
export class MockInterviewModule {}
