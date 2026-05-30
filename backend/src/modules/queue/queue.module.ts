import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AnalysisProcessor } from './processors/analysis.processor';
import { QueueService } from './queue.service';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { AiModule } from '../ai/ai.module';
import { ParserService } from '../resume/parser.service';
import { AnalyzerService } from '../resume/analyzer.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const rawUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const url = new URL(rawUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: 'resume-analysis',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    EmailModule,
    NotificationModule,
    AiModule,
  ],
  providers: [AnalysisProcessor, QueueService, ParserService, AnalyzerService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
