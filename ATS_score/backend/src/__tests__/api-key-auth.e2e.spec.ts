import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { JwtAuthGuard, JwtOnlyAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../common/guards/optional-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { JwtStrategy } from '../modules/auth/strategies/jwt.strategy';
import { ApiKeyStrategy } from '../modules/api-keys/api-key.strategy';
import { ApiKeysService } from '../modules/api-keys/api-keys.service';

// Runs the real guards and passport strategies over HTTP; only the key lookup is faked.
const SECRET = 'test-secret-for-api-key-e2e-0123456789';
const GOOD_KEY = `ats_${'a'.repeat(64)}`;

@Controller()
class ProbeController {
  @Get('either') @UseGuards(JwtAuthGuard)
  either(@CurrentUser() user: AuthUser) { return user; }

  @Get('jwt-only') @UseGuards(JwtOnlyAuthGuard)
  jwtOnly(@CurrentUser() user: AuthUser) { return user; }

  @Get('optional') @UseGuards(OptionalAuthGuard)
  optional(@CurrentUser() user: AuthUser | null) { return { user }; }
}

describe('API key authentication over HTTP', () => {
  let app: INestApplication;
  const authenticate = jest.fn(async (key: string) => (key === GOOD_KEY ? { id: 'u1', email: 'a@b.c' } : null));
  const jwt = () => new JwtService({ secret: SECRET }).sign({ sub: 'u2', email: 'jwt@b.c' });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        JwtStrategy,
        ApiKeyStrategy,
        { provide: ApiKeysService, useValue: { authenticate } },
        { provide: ConfigService, useValue: { getOrThrow: () => SECRET } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('accepts a key in the X-API-Key header', async () => {
    const res = await request(app.getHttpServer()).get('/either').set('X-API-Key', GOOD_KEY).expect(200);
    expect(res.body).toEqual({ id: 'u1', email: 'a@b.c' });
  });

  it('accepts a key as a Bearer token', async () => {
    const res = await request(app.getHttpServer()).get('/either').set('Authorization', `Bearer ${GOOD_KEY}`).expect(200);
    expect(res.body.id).toBe('u1');
  });

  it('still accepts a login token', async () => {
    const res = await request(app.getHttpServer()).get('/either').set('Authorization', `Bearer ${jwt()}`).expect(200);
    expect(res.body.id).toBe('u2');
  });

  it('refuses an unknown key and a missing one', async () => {
    await request(app.getHttpServer()).get('/either').set('X-API-Key', `ats_${'b'.repeat(64)}`).expect(401);
    await request(app.getHttpServer()).get('/either').expect(401);
  });

  it('refuses a valid key on a login-token-only route', async () => {
    await request(app.getHttpServer()).get('/jwt-only').set('X-API-Key', GOOD_KEY).expect(401);
    await request(app.getHttpServer()).get('/jwt-only').set('Authorization', `Bearer ${GOOD_KEY}`).expect(401);
    await request(app.getHttpServer()).get('/jwt-only').set('Authorization', `Bearer ${jwt()}`).expect(200);
  });

  it('optional routes see the key owner, or nobody', async () => {
    const withKey = await request(app.getHttpServer()).get('/optional').set('X-API-Key', GOOD_KEY).expect(200);
    expect(withKey.body.user.id).toBe('u1');
    const without = await request(app.getHttpServer()).get('/optional').expect(200);
    expect(without.body.user).toBeNull();
  });
});
