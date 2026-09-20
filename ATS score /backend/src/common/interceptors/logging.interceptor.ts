import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { id?: string }>();
    const response = context.switchToHttp().getResponse<Response>();

    // Bypass for streaming and SSE endpoints to prevent header modification conflicts
    if (request.path.includes('/stream') || request.path.includes('/chat')) {
      return next.handle();
    }

    const requestId = uuidv4();
    request.id = requestId;
    response.setHeader('X-Request-Id', requestId);
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          `[${requestId}] ${request.method} ${request.path} ${response.statusCode} ${Date.now() - start}ms`,
        );
      }),
    );
  }
}
