import { randomBytes } from 'node:crypto';

// Kept separate from seed.ts so these checks can be tested without touching a database.

export const MIN_SEED_PASSWORD_LENGTH = 12;

// "postgres" is the database's name inside docker-compose.yml.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'postgres']);

/**
 * The seed creates demo accounts (including an admin) and fake data, so it must never run against a
 * real database. Throws unless the target is clearly a local one.
 *  - NODE_ENV=production is always refused.
 *  - A database on another machine is refused unless SEED_ALLOW_REMOTE=yes is set on purpose.
 */
export function assertSafeToSeed(databaseUrl: string, env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is "production". The seed is for local development only.');
  }

  let host: string;
  try {
    host = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error('Refusing to seed: DATABASE_URL is missing or is not a valid address.');
  }

  if (!LOCAL_HOSTS.has(host) && env.SEED_ALLOW_REMOTE !== 'yes') {
    throw new Error(
      `Refusing to seed: the database host "${host}" is not on this machine. ` +
        'If you really mean to seed it, run again with SEED_ALLOW_REMOTE=yes.',
    );
  }
}

/**
 * The password for the demo accounts. Use SEED_PASSWORD if it is set (and long enough). Otherwise
 * make a random one, which the caller shows once and never stores.
 */
export function getSeedPassword(
  env: NodeJS.ProcessEnv = process.env,
): { password: string; generated: boolean } {
  const chosen = env.SEED_PASSWORD;
  if (chosen !== undefined && chosen !== '') {
    if (chosen.length < MIN_SEED_PASSWORD_LENGTH) {
      throw new Error(`SEED_PASSWORD is too short. Use at least ${MIN_SEED_PASSWORD_LENGTH} characters.`);
    }
    return { password: chosen, generated: false };
  }
  // 12 random bytes = 96 bits, shown as 16 URL-safe characters
  return { password: randomBytes(12).toString('base64url'), generated: true };
}
