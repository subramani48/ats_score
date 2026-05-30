"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
let QueueService = class QueueService {
    constructor(queue, config) {
        this.queue = queue;
        this.config = config;
        const rawUrl = config.get('REDIS_URL', 'redis://localhost:6379');
        const url = new URL(rawUrl);
        this.redisHost = url.hostname;
        this.redisPort = parseInt(url.port || '6379', 10);
        this.redisPassword = url.password || undefined;
    }
    async enqueue(payload) {
        const job = await this.queue.add('analyze', payload);
        return job.id;
    }
    async getJobStatus(jobId) {
        const job = await this.queue.getJob(jobId);
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        const state = await job.getState();
        const result = state === 'completed' ? job.returnvalue : null;
        const failedReason = state === 'failed' ? job.failedReason : null;
        return { success: true, jobId, state, progress: job.progress, result, failedReason };
    }
    createProgressStream(jobId) {
        return new rxjs_1.Observable(subscriber => {
            let queueEvents = null;
            const heartbeat = setInterval(() => {
                subscriber.next({ data: { heartbeat: true } });
            }, 25000);
            const cleanup = () => {
                clearInterval(heartbeat);
                if (queueEvents) {
                    queueEvents.off('progress', onProgress);
                    queueEvents.off('completed', onCompleted);
                    queueEvents.off('failed', onFailed);
                    void queueEvents.close();
                    queueEvents = null;
                }
            };
            const onProgress = ({ jobId: jid, data }) => {
                if (jid === jobId) {
                    subscriber.next({ data: data, type: 'progress' });
                }
            };
            const onCompleted = ({ jobId: jid, returnvalue }) => {
                if (jid === jobId) {
                    let parsed = returnvalue;
                    if (typeof returnvalue === 'string') {
                        try {
                            parsed = JSON.parse(returnvalue);
                        }
                        catch { }
                    }
                    subscriber.next({ data: parsed, type: 'completed' });
                    cleanup();
                }
            };
            const onFailed = ({ jobId: jid, failedReason }) => {
                if (jid === jobId) {
                    subscriber.next({ data: { message: failedReason }, type: 'error' });
                    cleanup();
                }
            };
            void this.queue.getJob(jobId).then(async (job) => {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (!job) {
                    subscriber.next({ data: { message: 'Job not found' }, type: 'error' });
                    cleanup();
                    return;
                }
                const state = await job.getState();
                if (state === 'completed') {
                    subscriber.next({ data: job.returnvalue, type: 'completed' });
                    cleanup();
                    return;
                }
                if (state === 'failed') {
                    subscriber.next({ data: { message: job.failedReason }, type: 'error' });
                    cleanup();
                    return;
                }
                queueEvents = new bullmq_2.QueueEvents('resume-analysis', {
                    connection: {
                        host: this.redisHost,
                        port: this.redisPort,
                        password: this.redisPassword,
                        maxRetriesPerRequest: null,
                    },
                });
                queueEvents.on('progress', onProgress);
                queueEvents.on('completed', onCompleted);
                queueEvents.on('failed', onFailed);
            });
            return () => cleanup();
        });
    }
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('resume-analysis')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        config_1.ConfigService])
], QueueService);
//# sourceMappingURL=queue.service.js.map