import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ResumeModule } from './modules/resume/resume.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { QueueModule } from './modules/queue/queue.module';
import { EmailModule } from './modules/email/email.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AiModule } from './modules/ai/ai.module';
import { CoverLetterModule } from './modules/cover-letter/cover-letter.module';
import { InterviewModule } from './modules/interview/interview.module';
import { BatchModule } from './modules/batch/batch.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { AdminModule } from './modules/admin/admin.module';
import { UserNotificationsModule } from './modules/user-notifications/user-notifications.module';
import { VersionModule } from './modules/version/version.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { CompanyAtsModule } from './modules/company-ats/company-ats.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 15 * 60 * 1000, limit: 100 },
      { name: 'upload', ttl: 60 * 60 * 1000, limit: 15 },
    ]),
    PrismaModule,
    AuthModule,
    ResumeModule,
    AnalysisModule,
    QueueModule,
    EmailModule,
    NotificationModule,
    AiModule,
    // ── New Feature Modules ─────────────────────────────────
    CoverLetterModule,
    InterviewModule,
    BatchModule,
    ScraperModule,
    AdminModule,
    UserNotificationsModule,
    VersionModule,
    ApiKeysModule,
    CompanyAtsModule,
    SubscriptionModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
