import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../common/guards/optional-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { AdminController } from '../modules/admin/admin.controller';
import { AnalysisController } from '../modules/analysis/analysis.controller';
import { CompanyAtsController } from '../modules/company-ats/company-ats.controller';
import { CoverLetterController } from '../modules/cover-letter/cover-letter.controller';
import { InterviewController } from '../modules/interview/interview.controller';
import { BatchController } from '../modules/batch/batch.controller';
import { VersionController } from '../modules/version/version.controller';
import { ScraperController } from '../modules/scraper/scraper.controller';
import { ApiKeysController } from '../modules/api-keys/api-keys.controller';
import { SubscriptionController } from '../modules/subscription/subscription.controller';
import { SubscriptionModule } from '../modules/subscription/subscription.module';
import { AuthController } from '../modules/auth/auth.controller';
import { ResumeController } from '../modules/resume/resume.controller';
import { MockInterviewController } from '../modules/mock-interview/mock-interview.controller';
import { StarStoriesController } from '../modules/star-stories/star-stories.controller';
import { BattleCardController } from '../modules/battle-card/battle-card.controller';
import { ApplicationsController } from '../modules/applications/applications.controller';
import { UserNotificationsController } from '../modules/user-notifications/user-notifications.controller';
import { AppModule } from '../app.module';

// Which routes need login, which role, and which rate limit. These read the decorators on the real controllers,
// so they fail if someone removes a guard or a limit.
type Ctor = { prototype: object };
const handlerOf = (cls: Ctor, method: string): object => (cls.prototype as Record<string, object>)[method];
const guardsOf = (cls: Ctor, method?: string): unknown[] => [
  ...(Reflect.getMetadata('__guards__', cls) ?? []),
  ...(method ? (Reflect.getMetadata('__guards__', handlerOf(cls, method)) ?? []) : []),
];
const meta = (key: string, cls: Ctor, method?: string) =>
  (method ? Reflect.getMetadata(key, handlerOf(cls, method)) : undefined) ?? Reflect.getMetadata(key, cls);
const limitOf = (cls: Ctor, method?: string) => ({ limit: meta('THROTTLER:LIMITdefault', cls, method), ttl: meta('THROTTLER:TTLdefault', cls, method) });
const skipsLimit = (cls: Ctor, method: string) => Reflect.getMetadata('THROTTLER:SKIPdefault', handlerOf(cls, method)) === true;
const MIN15 = 15 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

describe('login guards', () => {
  describe('admin routes (Fix 1)', () => {
    it('need login AND the admin role, in that order', () => {
      expect(guardsOf(AdminController)).toEqual([JwtAuthGuard, RolesGuard]);
      expect(Reflect.getMetadata(ROLES_KEY, AdminController)).toEqual(['admin']);
    });
  });

  describe('analysis routes (Fix 8)', () => {
    it.each(['findOne', 'getKeywordGap', 'chatWithAI', 'compareAnalyses', 'getUserHistory', 'getUserAnalytics'])(
      '%s needs login', method => expect(guardsOf(AnalysisController, method)).toContain(JwtAuthGuard),
    );
    it('benchmark stays open (group averages only, no personal data)', () => {
      expect(guardsOf(AnalysisController, 'getPeerBenchmark')).toEqual([]);
    });
  });

  describe('AI routes need login and are limited (Fix 9)', () => {
    it.each([
      ['company-ats analyze', CompanyAtsController, 'analyze', 20, MIN15],
      ['cover letter generate', CoverLetterController, 'generate', 20, MIN15],
      ['interview generate', InterviewController, 'generate', 20, MIN15],
      ['batch analyze', BatchController, 'analyze', 5, HOUR],
    ] as const)('%s', (_label, cls, method, limit, ttl) => {
      const guards = guardsOf(cls as Ctor, method);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).not.toContain(OptionalAuthGuard);
      expect(limitOf(cls as Ctor, method)).toEqual({ limit, ttl });
    });

    it.each([[CoverLetterController], [InterviewController], [BatchController]])('history routes still need login (%p)', cls => {
      expect(guardsOf(cls as Ctor, 'getHistory')).toContain(JwtAuthGuard);
    });
  });

  describe('scraper (Fix 4)', () => {
    it('needs login and is limited to 20 per 15 minutes', () => {
      expect(guardsOf(ScraperController)).toContain(JwtAuthGuard);
      expect(limitOf(ScraperController)).toEqual({ limit: 20, ttl: MIN15 });
    });
  });

  describe('versions (Fix 10), api keys, subscription and notifications', () => {
    it.each([[VersionController], [ApiKeysController], [SubscriptionController], [UserNotificationsController]])(
      'need login (%p)', cls => expect(guardsOf(cls as Ctor)).toContain(JwtAuthGuard),
    );
  });

  describe('Interview Pro', () => {
    it.each([[MockInterviewController], [StarStoriesController], [BattleCardController], [ApplicationsController]])(
      'every route needs login (%p)', cls => expect(guardsOf(cls as Ctor)).toContain(JwtAuthGuard),
    );
  });
});

describe('rate limits', () => {
  it('login is limited to 10 per 15 minutes and signup to 5 per hour (Fix 12)', () => {
    expect(limitOf(AuthController, 'login')).toEqual({ limit: 10, ttl: MIN15 });
    expect(limitOf(AuthController, 'register')).toEqual({ limit: 5, ttl: HOUR });
    expect(guardsOf(AuthController, 'getMe')).toContain(JwtAuthGuard);
  });

  it('resume upload keeps its limit of 15 per hour and allows signed-out visitors (Fix 3)', () => {
    expect(limitOf(ResumeController, 'uploadAndEnqueue')).toEqual({ limit: 15, ttl: HOUR });
    expect(guardsOf(ResumeController, 'uploadAndEnqueue')).toContain(OptionalAuthGuard);
  });

  it('the two job-progress routes are exempt from limits, because the website polls them every few seconds (Fix 3)', () => {
    expect(skipsLimit(ResumeController, 'getJobStatus')).toBe(true);
    expect(skipsLimit(ResumeController, 'streamJobProgress')).toBe(true);
    expect(skipsLimit(ResumeController, 'uploadAndEnqueue')).toBe(false);
  });

  it('the rate limiter is switched on for the whole site, and the upload/batch names are not extra site-wide limits (Fix 3)', () => {
    const providers: Array<{ provide?: unknown; useClass?: unknown }> = Reflect.getMetadata('providers', AppModule);
    expect(providers.some(p => p.provide === APP_GUARD && p.useClass === ThrottlerGuard)).toBe(true);
    const source = fs.readFileSync(path.join(__dirname, '../app.module.ts'), 'utf8');
    expect(source).toContain("throttlers: [{ name: 'default', ttl: 15 * 60 * 1000, limit: 100 }]");
    expect(source).not.toMatch(/name: 'upload'/);   // an extra named limit would apply to EVERY route
    expect(source).toContain("errorMessage: 'Too many requests. Please wait a few minutes and try again.'");
  });
});

describe('module wiring', () => {
  it('SubscriptionModule is global, so any controller can check plan limits (Fix 11)', () => {
    expect(Reflect.getMetadata('__module:global__', SubscriptionModule)).toBe(true);
  });
});
