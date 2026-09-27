import { MIN_SEED_PASSWORD_LENGTH, assertSafeToSeed, getSeedPassword } from '../../prisma/seed-helpers';

// Fix 6: the seed script must never run against a real database or use a hardcoded password
describe('assertSafeToSeed()', () => {
  it.each([
    'postgresql://user@localhost:5432/db', 'postgresql://u:p@127.0.0.1:5432/x', 'postgresql://u:p@[::1]:5432/x',
    'postgresql://postgres:test@postgres:5432/ats',
  ])('allows a local database: %s', url => {
    expect(() => assertSafeToSeed(url, { NODE_ENV: 'development' })).not.toThrow();
  });

  it('allows a local database when NODE_ENV is not set', () => {
    expect(() => assertSafeToSeed('postgresql://u@localhost/x', {})).not.toThrow();
  });

  it('always refuses NODE_ENV=production, even for localhost, and even with the override', () => {
    expect(() => assertSafeToSeed('postgresql://u@localhost/x', { NODE_ENV: 'production' })).toThrow(/production/);
    expect(() => assertSafeToSeed('postgresql://u@localhost/x', { NODE_ENV: 'production', SEED_ALLOW_REMOTE: 'yes' })).toThrow(/production/);
  });

  it.each([
    'postgresql://u:p@dpg-abc123.oregon-postgres.render.com/db', 'postgresql://u:p@10.0.0.5:5432/db', 'postgresql://u:p@db.example.com/x',
    'postgresql://u:p@localhost.evil.com/x', 'postgresql://u:p@127.0.0.1.evil.com/x',
  ])('refuses a database that is not on this machine: %s', url => {
    expect(() => assertSafeToSeed(url, { NODE_ENV: 'development' })).toThrow(/not on this machine/);
  });

  it('allows a remote database only with SEED_ALLOW_REMOTE exactly "yes"', () => {
    const url = 'postgresql://u:p@db.example.com/x';
    expect(() => assertSafeToSeed(url, { SEED_ALLOW_REMOTE: 'yes' })).not.toThrow();
    for (const wrong of ['true', '1', 'YES', 'y', '']) {
      expect(() => assertSafeToSeed(url, { SEED_ALLOW_REMOTE: wrong })).toThrow();
    }
  });

  it('refuses a missing or invalid address', () => {
    expect(() => assertSafeToSeed('', {})).toThrow(/DATABASE_URL/);
    expect(() => assertSafeToSeed('not a url', {})).toThrow(/DATABASE_URL/);
  });
});

describe('getSeedPassword()', () => {
  it('makes a random 16-character URL-safe password when none is set, different each time', () => {
    const a = getSeedPassword({});
    const b = getSeedPassword({});
    expect(a.generated).toBe(true);
    expect(a.password).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(a.password).not.toBe(b.password);
  });

  it('treats an empty SEED_PASSWORD as not set', () => {
    expect(getSeedPassword({ SEED_PASSWORD: '' }).generated).toBe(true);
  });

  it('uses the chosen password as given', () => {
    expect(getSeedPassword({ SEED_PASSWORD: 'a-very-long-secret-1' })).toEqual({ password: 'a-very-long-secret-1', generated: false });
  });

  it(`accepts exactly ${MIN_SEED_PASSWORD_LENGTH} characters and refuses fewer`, () => {
    expect(getSeedPassword({ SEED_PASSWORD: 'x'.repeat(MIN_SEED_PASSWORD_LENGTH) }).generated).toBe(false);
    expect(() => getSeedPassword({ SEED_PASSWORD: 'x'.repeat(MIN_SEED_PASSWORD_LENGTH - 1) })).toThrow(/too short/);
  });

  it('refuses the old hardcoded password', () => {
    expect(() => getSeedPassword({ SEED_PASSWORD: 'password123' })).toThrow(/too short/);
  });
});
