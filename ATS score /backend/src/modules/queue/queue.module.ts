import { Module } from '@nestjs/common';
import { AnalysisProcessor } from './processors/analysis.processor';
import { QueueService } from './queue.service';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { AiModule } from '../ai/ai.module';
import { ParserService } from '../resume/parser.service';
import { AnalyzerService } from '../resume/analyzer.service';

@Module({
  imports: [
    EmailModule,
    NotificationModule,
    AiModule,
  ],
  providers: [AnalysisProcessor, QueueService, ParserService, AnalyzerService],
  exports: [QueueService],
})
export class QueueModule {}
