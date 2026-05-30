"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/env"); // validates env on startup
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const env_1 = require("./config/env");
const logger_1 = require("./lib/logger");
const requestLogger_middleware_1 = require("./middleware/requestLogger.middleware");
const errorHandler_middleware_1 = require("./middleware/errorHandler.middleware");
const rateLimit_middleware_1 = require("./middleware/rateLimit.middleware");
const index_1 = __importDefault(require("./api/v1/index"));
const analysis_worker_1 = require("./services/queue/workers/analysis.worker");
const app = (0, express_1.default)();
// Security & perf
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: env_1.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
// Logging & request ID
app.use(requestLogger_middleware_1.requestLogger);
// Body parsing
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
app.use('/api', rateLimit_middleware_1.apiLimiter);
// Health check (no rate limit)
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});
// API v1
app.use('/api/v1', index_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});
// Error handler (must be last)
app.use(errorHandler_middleware_1.errorHandler);
// Start server
const server = app.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`🚀 ATS Analyzer API v2 running on port ${env_1.env.PORT} (${env_1.env.NODE_ENV})`);
    logger_1.logger.info(`🔗 Frontend: ${env_1.env.FRONTEND_URL}`);
    logger_1.logger.info('✅ BullMQ worker started');
});
// Graceful shutdown
const shutdown = async (signal) => {
    logger_1.logger.info(`${signal} received — shutting down gracefully`);
    await analysis_worker_1.analysisWorker.close();
    server.close(() => {
        logger_1.logger.info('HTTP server closed');
        process.exit(0);
    });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
exports.default = app;
//# sourceMappingURL=server.js.map