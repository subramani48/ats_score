"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueAnalysis = exports.analysisQueueEvents = exports.analysisQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../config/redis");
exports.analysisQueue = new bullmq_1.Queue('resume-analysis', {
    connection: redis_1.redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
    },
});
exports.analysisQueueEvents = new bullmq_1.QueueEvents('resume-analysis', { connection: redis_1.redis });
const enqueueAnalysis = async (payload) => {
    const job = await exports.analysisQueue.add('analyze', payload, {
        priority: payload.mode === 'rewrite' ? 1 : 2,
    });
    return job.id;
};
exports.enqueueAnalysis = enqueueAnalysis;
//# sourceMappingURL=queue.service.js.map