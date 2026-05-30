"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamJobProgress = exports.getJobStatus = exports.uploadAndEnqueue = void 0;
const multer_1 = __importDefault(require("multer"));
const queue_service_1 = require("../services/queue/queue.service");
const queue_service_2 = require("../services/queue/queue.service");
const errors_1 = require("../lib/errors");
const env_1 = require("../config/env");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: env_1.env.MAX_FILE_SIZE_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
        cb(null, allowed.includes(file.mimetype));
    },
}).single('resume');
const uploadAndEnqueue = (req, res, next) => {
    upload(req, res, async (err) => {
        if (err)
            return next(err);
        const file = req.file;
        if (!file)
            throw new errors_1.ValidationError('Please upload a PDF or DOCX file');
        const { name, email, domain, mode = 'analyze', jobDescription } = req.body;
        if (!name?.trim() || !email?.trim())
            throw new errors_1.ValidationError('Name and email are required');
        if (!domain?.trim())
            throw new errors_1.ValidationError('Please select a job domain');
        if (mode === 'rewrite' && !jobDescription?.trim())
            throw new errors_1.ValidationError('Job description is required for rewrite mode');
        const jobId = await (0, queue_service_1.enqueueAnalysis)({
            resumeBuffer: file.buffer.toString('base64'),
            mode: mode,
            domain,
            jobDescription,
            userId: req.userId,
            name,
            email,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
        });
        res.status(202).json({ success: true, jobId, message: 'Analysis queued — connect to the SSE stream for real-time progress' });
    });
};
exports.uploadAndEnqueue = uploadAndEnqueue;
const getJobStatus = async (req, res) => {
    const { jobId } = req.params;
    const job = await queue_service_2.analysisQueue.getJob(jobId);
    if (!job) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } });
        return;
    }
    const state = await job.getState();
    const progress = job.progress;
    const result = state === 'completed' ? job.returnvalue : null;
    const failedReason = state === 'failed' ? job.failedReason : null;
    res.json({ success: true, jobId, state, progress, result, failedReason });
};
exports.getJobStatus = getJobStatus;
const streamJobProgress = async (req, res) => {
    const { jobId } = req.params;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const send = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    // Check if already completed
    const job = await queue_service_2.analysisQueue.getJob(jobId);
    if (job) {
        const state = await job.getState();
        if (state === 'completed') {
            send('completed', job.returnvalue);
            res.end();
            return;
        }
        if (state === 'failed') {
            send('error', { message: job.failedReason });
            res.end();
            return;
        }
    }
    const { QueueEvents } = await Promise.resolve().then(() => __importStar(require('bullmq')));
    const { redis } = await Promise.resolve().then(() => __importStar(require('../config/redis')));
    const queueEvents = new QueueEvents('resume-analysis', { connection: redis });
    const onProgress = ({ jobId: jid, data }) => {
        if (jid === jobId)
            send('progress', data);
    };
    const onCompleted = ({ jobId: jid, returnvalue }) => {
        if (jid === jobId) {
            send('completed', returnvalue);
            cleanup();
        }
    };
    const onFailed = ({ jobId: jid, failedReason }) => {
        if (jid === jobId) {
            send('error', { message: failedReason });
            cleanup();
        }
    };
    const cleanup = () => {
        queueEvents.off('progress', onProgress);
        queueEvents.off('completed', onCompleted);
        queueEvents.off('failed', onFailed);
        queueEvents.close();
        res.end();
    };
    queueEvents.on('progress', onProgress);
    queueEvents.on('completed', onCompleted);
    queueEvents.on('failed', onFailed);
    req.on('close', cleanup);
    // Heartbeat every 25s to keep connection alive
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);
    req.on('close', () => clearInterval(heartbeat));
};
exports.streamJobProgress = streamJobProgress;
//# sourceMappingURL=resume.controller.js.map