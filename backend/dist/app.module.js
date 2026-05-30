"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const resume_module_1 = require("./modules/resume/resume.module");
const analysis_module_1 = require("./modules/analysis/analysis.module");
const queue_module_1 = require("./modules/queue/queue.module");
const email_module_1 = require("./modules/email/email.module");
const notification_module_1 = require("./modules/notification/notification.module");
const ai_module_1 = require("./modules/ai/ai.module");
const cover_letter_module_1 = require("./modules/cover-letter/cover-letter.module");
const interview_module_1 = require("./modules/interview/interview.module");
const batch_module_1 = require("./modules/batch/batch.module");
const scraper_module_1 = require("./modules/scraper/scraper.module");
const admin_module_1 = require("./modules/admin/admin.module");
const user_notifications_module_1 = require("./modules/user-notifications/user-notifications.module");
const version_module_1 = require("./modules/version/version.module");
const api_keys_module_1 = require("./modules/api-keys/api-keys.module");
const company_ats_module_1 = require("./modules/company-ats/company-ats.module");
const subscription_module_1 = require("./modules/subscription/subscription.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const configuration_1 = __importDefault(require("./config/configuration"));
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, load: [configuration_1.default] }),
            throttler_1.ThrottlerModule.forRoot([
                { name: 'global', ttl: 15 * 60 * 1000, limit: 100 },
                { name: 'upload', ttl: 60 * 60 * 1000, limit: 15 },
            ]),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            resume_module_1.ResumeModule,
            analysis_module_1.AnalysisModule,
            queue_module_1.QueueModule,
            email_module_1.EmailModule,
            notification_module_1.NotificationModule,
            ai_module_1.AiModule,
            cover_letter_module_1.CoverLetterModule,
            interview_module_1.InterviewModule,
            batch_module_1.BatchModule,
            scraper_module_1.ScraperModule,
            admin_module_1.AdminModule,
            user_notifications_module_1.UserNotificationsModule,
            version_module_1.VersionModule,
            api_keys_module_1.ApiKeysModule,
            company_ats_module_1.CompanyAtsModule,
            subscription_module_1.SubscriptionModule,
        ],
        providers: [
            { provide: core_1.APP_FILTER, useClass: http_exception_filter_1.HttpExceptionFilter },
            { provide: core_1.APP_INTERCEPTOR, useClass: logging_interceptor_1.LoggingInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map