import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Requires a login token (JWT) or an API key (see api-key.strategy.ts). */
@Injectable()
export class JwtAuthGuard extends AuthGuard(['jwt', 'api-key']) {
  handleRequest<T>(err: unknown, user: T): T {
    if (err || !user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }
}

/**
 * Requires a login token; API keys are refused. For routes a leaked key must not reach:
 * managing API keys themselves, and the admin area.
 */
@Injectable()
export class JwtOnlyAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(err: unknown, user: T): T {
    if (err || !user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
