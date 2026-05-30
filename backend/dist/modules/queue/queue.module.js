"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const analysis_processor_1 = require("./processors/analysis.processor");
const queue_service_1 = require("./queue.service");
const email_module_1 = require("../email/email.module");
const notification_module_1 = require("../notification/notification.module");
const ai_module_1 = require("../ai/ai.module");
const parser_service_1 = require("../resume/parser.service");
const analyzer_service_1 = require("../resume/analyzer.service");
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const rawUrl = config.get('REDIS_URL', 'redis://localhost:6379');
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
            bullmq_1.BullModule.registerQueue({
                name: 'resume-analysis',
                defaultJobOptions: {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: 100,
                    removeOnFail: 500,
                },
            }),
            email_module_1.EmailModule,
            notification_module_1.NotificationModule,
            ai_module_1.AiModule,
        ],
        providers: [analysis_processor_1.AnalysisProcessor, queue_service_1.QueueService, parser_service_1.ParserService, analyzer_service_1.AnalyzerService],
        exports: [queue_service_1.QueueService, bullmq_1.BullModule],
    })
], QueueModule);
//# sourceMappingURL=queue.module.js.map