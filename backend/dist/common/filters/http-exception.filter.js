"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(HttpExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const contentType = response.getHeader('content-type');
        const isSse = response.headersSent || (typeof contentType === 'string' && contentType.includes('text/event-stream'));
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let code = 'INTERNAL_ERROR';
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const resp = exceptionResponse;
                const raw = resp['message'];
                message = Array.isArray(raw) ? raw.join('; ') : raw || message;
                code = resp['error'] || code;
            }
        }
        else if (exception?.['code'] === 'LIMIT_FILE_SIZE') {
            status = 413;
            message = `File exceeds the ${process.env.MAX_FILE_SIZE_MB ?? 5}MB size limit`;
            code = 'FILE_TOO_LARGE';
        }
        else if (exception instanceof Error) {
            this.logger.error(`${exception.message}`, exception.stack);
            message = exception.message;
        }
        if (isSse) {
            try {
                response.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
                response.end();
            }
            catch (err) {
                this.logger.warn(`Failed to write SSE error response: ${err.message}`);
            }
            return;
        }
        response.status(status).json({
            success: false,
            error: { code, message },
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map