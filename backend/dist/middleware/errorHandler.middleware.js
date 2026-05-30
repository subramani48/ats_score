"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_1 = require("../lib/errors");
const logger_1 = require("../lib/logger");
const errorHandler = (err, req, res, _next) => {
    const requestId = req.id ?? 'unknown';
    logger_1.logger.error({
        message: err.message,
        stack: err.stack,
        requestId,
        path: req.path,
        method: req.method,
    });
    if (err instanceof errors_1.AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: { code: err.code, message: err.message },
            requestId,
        });
        return;
    }
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
            success: false,
            error: { code: 'FILE_TOO_LARGE', message: 'File exceeds the maximum allowed size' },
            requestId,
        });
        return;
    }
    res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
        requestId,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.middleware.js.map