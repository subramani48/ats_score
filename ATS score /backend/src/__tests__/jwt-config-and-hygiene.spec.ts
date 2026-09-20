import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import configuration from '../config/configuration';
import { JwtStrategy } from '../modules/auth/strategies/jwt.strategy';

// Regression tests for the repository cleanup: the login (JWT) secret must come from the environment only,
// the server must refuse to start without a proper one, and no real-looking secret may be written into files that
// are committed. These tests use invented values only; they never read a real .env file.

const BACKEND = path.join(__dirname, '..', '..');
const PROJECT = path.join(BACKEND, '..');            // "ATS score /"
const read = (p: string) => fs.readFileSync(p, 'utf8');

/** A complete, invented environment. */
const validEnv = (over: Record<string, string | undefined> = {}) => ({
  DATABASE_URL: 'postgresql://user:password@localhost:5432/testdb',
  GEMINI_API_KEY: 'fake-gemini-key-for-tests',
  SMTP_USER: 'someone@example.com',
  SMTP_PASS: 'fake-smtp-password',
  JWT_SECRET: 'TEST-ONLY-8f3kQ2mZx9LpVb7Rt4NwYc1Hd6JsAe0U',
  ...over,
});

/** Runs the real config loader against an invented environment, capturing what it prints and whether it exits. */
function load(env: Record<string, string | undefined>) {
  const saved = process.env;
  process.env = { ...env } as NodeJS.ProcessEnv;
  const out: string[] = [];
  const err = jest.spyOn(console, 'error').mockImplementation((...a: unknown[]) => { out.push(a.map(String).join(' ')); });
  const exit = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error(`exit:${code}`); }) as never);
  try {
    const result = configuration() as Record<string, unknown>;
    return { result, exited: false, printed: out.join('\n') };
  } catch (e) {
    if (!String((e as Error).message).startsWith('exit:')) throw e;
    return { result: undefined, exited: true, printed: out.join('\n') };
  } finally { process.env = saved; err.mockRestore(); exit.mockRestore(); }
}

describe('JWT secret: required, no fallback', () => {
  it('a proper secret is accepted and passed through unchanged', () => {
    const r = load(validEnv());
    expect(r.exited).toBe(false);
    expect(r.result!.JWT_SECRET).toBe('TEST-ONLY-8f3kQ2mZx9LpVb7Rt4NwYc1Hd6JsAe0U');
  });

  it('a missing secret stops the server (nothing is filled in from the code)', () => {
    const r = load(validEnv({ JWT_SECRET: undefined }));
    expect(r.exited).toBe(true);
    expect(r.printed).toContain('JWT_SECRET');
  });

  it('an empty or too-short secret stops the server', () => {
    for (const bad of ['', 'short', '123456789012345']) {
      const r = load(validEnv({ JWT_SECRET: bad }));
      expect(r.exited).toBe(true);
      expect(r.printed).toContain('JWT_SECRET');
    }
  });

  it('a 16-character secret is the minimum that passes', () => {
    expect(load(validEnv({ JWT_SECRET: 'Aa1!Aa1!Aa1!Aa1!' })).exited).toBe(false);
  });

  it('the error message names the setting but never prints the value that was supplied', () => {
    const r = load(validEnv({ JWT_SECRET: 'tooShort-9x' }));
    expect(r.exited).toBe(true);
    expect(r.printed).not.toContain('tooShort-9x');
  });

  it.each([
    'your-super-secret-jwt-key-change-in-production',
    'your-random-secret-of-at-least-32-characters-generate-your-own',
    'change-me-to-something-long-and-random-please',
    'CHANGE_ME_EXAMPLE_ONLY_0123456789',
    'replace-with-your-own-secret-value-here',
    'placeholder-secret-value-1234567890',
    'example-secret-value-1234567890',
  ])('a placeholder such as "%s" stops the server', placeholder => {
    const r = load(validEnv({ JWT_SECRET: placeholder }));
    expect(r.exited).toBe(true);
    expect(r.printed).toMatch(/placeholder/i);
  });

  it('the JWT value in .env.example is a placeholder that the server refuses (copying the template unchanged cannot work)', () => {
    const line = read(path.join(BACKEND, '.env.example')).split('\n').find(l => l.startsWith('JWT_SECRET='))!;
    const value = line.slice('JWT_SECRET='.length).trim().replace(/^["']|["']$/g, '');
    expect(load(validEnv({ JWT_SECRET: value })).exited).toBe(true);
  });

  it('other required settings still stop the server when missing (nothing else was loosened)', () => {
    for (const key of ['DATABASE_URL', 'GEMINI_API_KEY', 'SMTP_USER', 'SMTP_PASS']) {
      expect(load(validEnv({ [key]: undefined })).exited).toBe(true);
    }
  });
});

describe('JwtStrategy', () => {
  it('cannot be created when JWT_SECRET is missing', () => {
    expect(() => new JwtStrategy(new ConfigService({}))).toThrow();
  });
  it('is created when a secret is configured', () => {
    expect(() => new JwtStrategy(new ConfigService({ JWT_SECRET: 'TEST-ONLY-8f3kQ2mZx9LpVb7Rt4NwYc1Hd6JsAe0U' }))).not.toThrow();
  });
});

// ------------------------------------------------------------------------------------------------ source hygiene
function walk(dir: string, keep: (p: string) => boolean, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.next', '.git', 'coverage'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, keep, out); else if (keep(p)) out.push(p);
  }
  return out;
}
const isCode = (p: string) => /\.(ts|js|mjs)$/.test(p) && !p.includes(`${path.sep}__tests__${path.sep}`);

describe('no fallback secrets in the code', () => {
  const code = walk(BACKEND, isCode);

  it('no code file gives JWT_SECRET a default value', () => {
    const offenders = code.filter(p => /JWT_SECRET['"]?\s*[,)]\s*['"`]|JWT_SECRET[^\n]*\.default\(|JWT_SECRET[^\n]*\?\?\s*['"`]/.test(read(p)));
    expect(offenders.map(p => path.relative(BACKEND, p))).toEqual([]);
  });

  it('the two old fallback values are gone from every code file', () => {
    const old = [['ats', 'dev', 'secret'].join('-'), ['ats', 'analyzer', 'dev', 'secret'].join('-')];
    const offenders = code.filter(p => old.some(o => read(p).includes(o)));
    expect(offenders.map(p => path.relative(BACKEND, p))).toEqual([]);
  });

  it('the JWT module and strategy read the secret with getOrThrow', () => {
    for (const file of ['src/modules/auth/auth.module.ts', 'src/modules/auth/strategies/jwt.strategy.ts']) {
      const src = read(path.join(BACKEND, file));
      expect(src).toContain("getOrThrow<string>('JWT_SECRET')");
      expect(src).not.toMatch(/\.get<string>\('JWT_SECRET'/);
    }
  });

  it('the seed does not guess a database and the Prisma fallback is a generic placeholder', () => {
    expect(read(path.join(BACKEND, 'prisma/seed.ts'))).not.toMatch(/DATABASE_URL\s*\?\?\s*['"`]/);
    const cfg = read(path.join(BACKEND, 'prisma.config.ts'));
    expect(cfg).toContain('postgresql://user:password@localhost');
  });
});

describe('no real-looking secrets in committed files', () => {
  const SECRET_NAME = /\b([A-Z][A-Z0-9_]*(?:SECRET|PASS|PASSWORD|TOKEN|API_KEY|PRIVATE_KEY))\s*[=:]\s*['"]?([^\s'",;]+)/;
  const PLACEHOLDER = /^(|your[-_ ].*|.*your[-_ ].*|change.?me.*|replace.?with.*|<.*>|x{3,}.*|.*example.*|.*placeholder.*|password|secret|localhost.*|fake.*|test.*)$/i;
  const CODE_LIKE = /^(process\.|config\.|configService\.|z\.|env\.|this\.|req\.|\$|\{|\(|\/)/;   // code, not a value (includes regex literals)
  const files = [
    ...walk(BACKEND, p => /\.(md|txt|yml|yaml|example|json|ts|js|mjs)$/.test(p) && !/package-lock\.json$/.test(p) && !p.includes(`${path.sep}__tests__${path.sep}`)),
    ...(fs.existsSync(path.join(PROJECT, '.github')) ? walk(path.join(PROJECT, '.github'), () => true) : []),
    ...[path.join(PROJECT, '..', 'README.md'), path.join(PROJECT, 'frontend', 'README.md')].filter(fs.existsSync),
  ].filter(p => path.basename(p) !== '.env');

  it('no secret-named setting has a real-looking value (names and file paths are reported, never the value)', () => {
    const found: string[] = [];
    for (const p of files) {
      read(p).split('\n').forEach((line, i) => {
        const m = SECRET_NAME.exec(line);
        if (!m) return;
        const value = m[2];
        if (value.length >= 8 && !PLACEHOLDER.test(value) && !CODE_LIKE.test(value)) found.push(`${path.relative(PROJECT, p)}:${i + 1} ${m[1]}`);
      });
    }
    expect(found).toEqual([]);
  });

  it('no file contains a Google API key, GitHub token, Telegram bot token or private key block', () => {
    const shapes = [/AIza[0-9A-Za-z_-]{35}/, /gh[pousr]_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{40,}/, /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/, /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/];
    const found: string[] = [];
    for (const p of files) { const t = read(p); shapes.forEach((re, i) => { if (re.test(t)) found.push(`${path.relative(PROJECT, p)} (secret type #${i + 1})`); }); }
    expect(found).toEqual([]);
  });
});

describe('deployment files carry no default credentials', () => {
  const findUp = (name: string) => { let d = PROJECT; for (let i = 0; i < 4; i++) { const c = path.join(d, name); if (fs.existsSync(c)) return c; d = path.join(d, '..'); } return undefined; };

  it('docker-compose.yml has no default value for any password, secret, token or key (${NAME:-default})', () => {
    const file = findUp('docker-compose.yml');
    if (!file) return;
    const defaults = [...read(file).matchAll(/\$\{([A-Z_]*(?:SECRET|PASS|PASSWORD|TOKEN|KEY)[A-Z_]*):-([^}]+)\}/g)].map(m => m[1]);
    expect(defaults).toEqual([]);
  });

  it('the database password in docker-compose.yml is required (the file refuses to start without it)', () => {
    const file = findUp('docker-compose.yml');
    if (!file) return;
    expect(read(file)).toMatch(/\$\{DB_PASSWORD:\?[^}]+\}/);
  });
});

describe('repository layout', () => {
  it('there is no nested git repository inside the project', () => {
    const nested = ['frontend', 'backend'].map(d => path.join(PROJECT, d, '.git')).filter(fs.existsSync);
    expect(nested).toEqual([]);
  });

  it('.gitignore keeps real settings files, installed packages and build output out of the repository', () => {
    let dir = PROJECT; let file: string | undefined;
    for (let i = 0; i < 4 && !file; i++) { const c = path.join(dir, '.gitignore'); if (fs.existsSync(c)) file = c; dir = path.join(dir, '..'); }
    if (!file) return;   // not present when only the backend folder is checked out
    const rules = read(file).split('\n').map(l => l.trim());
    for (const rule of ['.env', '.env.*', '!.env.example', 'node_modules/', 'dist/', '.next/', '*.pem', '*.key']) expect(rules).toContain(rule);
  });
});
