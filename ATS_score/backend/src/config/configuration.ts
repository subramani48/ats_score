import { z } from 'zod';

// A copy of .env.example that was never edited must not start the server: its placeholder is long enough to pass a
// length check, and it is public, so anyone could forge login tokens with it.
const PLACEHOLDER_SECRET = /^(your[-_ ]|change[-_ ]?me|replace[-_ ]?with|placeholder|example)/i;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  // No default on purpose: a missing or weak secret must stop the server, never fall back to a value written in code.
  JWT_SECRET: z.string({ required_error: 'JWT_SECRET is required' })
    .min(16, 'JWT_SECRET must be at least 16 characters (use a long random value)')
    .refine(v => !PLACEHOLDER_SECRET.test(v), 'JWT_SECRET is still the placeholder from .env.example; set your own random value'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),
});

export default () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
    process.exit(1);
  }
  return result.data;
};
