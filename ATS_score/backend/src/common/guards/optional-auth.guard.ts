import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends AuthGuard(['jwt', 'api-key']) {
  handleRequest<T>(_err: unknown, user: T): T | null {
    return user || null;
  }
}
