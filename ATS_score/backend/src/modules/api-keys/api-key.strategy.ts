import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-strategy';
import type { Request } from 'express';
import { API_KEY_PREFIX, ApiKeysService } from './api-keys.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

type Verify = (key: string, done: (err: unknown, user?: AuthUser | null) => void) => void;

/** Reads an API key from `X-API-Key: ats_…` or `Authorization: Bearer ats_…`. */
export function extractApiKey(req: Request): string | null {
  const header = req.headers['x-api-key'];
  if (typeof header === 'string' && header.trim()) return header.trim();

  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim();
    if (token.startsWith(API_KEY_PREFIX)) return token;
  }
  return null;
}

class HeaderApiKeyStrategy extends Strategy {
  constructor(private readonly verify: Verify) {
    super();
  }

  authenticate(req: Request): void {
    const key = extractApiKey(req);
    if (!key) return this.fail(401);

    this.verify(key, (err, user) => {
      if (err) return this.error(err as Error);
      if (!user) return this.fail(401);
      this.success(user);
    });
  }
}

/**
 * Lets scripts and other apps call the API with a key from the API Keys page instead of a login token.
 * JwtAuthGuard and OptionalAuthGuard try this after the JWT strategy; the key acts as its owner.
 */
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderApiKeyStrategy, 'api-key') {
  constructor(private readonly apiKeys: ApiKeysService) {
    super();
  }

  validate(key: string): Promise<AuthUser | null> {
    return this.apiKeys.authenticate(key);
  }
}
