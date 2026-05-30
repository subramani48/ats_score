import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const contentType = response.getHeader('content-type');
    const isSse = response.headersSent || (typeof contentType === 'string' && contentType.includes('text/event-stream'));

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        const raw = resp['message'];
        message = Array.isArray(raw) ? raw.join('; ') : (raw as string) || message;
        code = (resp['error'] as string) || code;
      }
    } else if ((exception as Record<string, unknown>)?.['code'] === 'LIMIT_FILE_SIZE') {
      status = 413;
      message = `File exceeds the ${process.env.MAX_FILE_SIZE_MB ?? 5}MB size limit`;
      code = 'FILE_TOO_LARGE';
    } else if (exception instanceof Error) {
      this.logger.error(`${exception.message}`, exception.stack);
      message = exception.message;
    }

    if (isSse) {
      try {
        response.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
        response.end();
      } catch (err) {
        this.logger.warn(`Failed to write SSE error response: ${(err as Error).message}`);
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
}
