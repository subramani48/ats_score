"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileTooLargeError = exports.RateLimitError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    message;
    statusCode;
    code;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class RateLimitError extends AppError {
    constructor() {
        super('Too many requests — try again later', 429, 'RATE_LIMIT_EXCEEDED');
    }
}
exports.RateLimitError = RateLimitError;
class FileTooLargeError extends AppError {
    constructor(maxMb) {
        super(`File exceeds maximum size of ${maxMb}MB`, 413, 'FILE_TOO_LARGE');
    }
}
exports.FileTooLargeError = FileTooLargeError;
//# sourceMappingURL=errors.js.map