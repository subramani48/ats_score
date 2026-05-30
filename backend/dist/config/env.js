"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(5000),
    DATABASE_URL: zod_1.z.string().min(1),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    GEMINI_API_KEY: zod_1.z.string().min(1),
    SMTP_HOST: zod_1.z.string().default('smtp.gmail.com'),
    SMTP_PORT: zod_1.z.coerce.number().default(587),
    SMTP_USER: zod_1.z.string().min(1),
    SMTP_PASS: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(16).default('ats-analyzer-dev-secret-32-chars!!'),
    TELEGRAM_BOT_TOKEN: zod_1.z.string().optional(),
    TELEGRAM_ADMIN_CHAT_ID: zod_1.z.string().optional(),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:3000'),
    MAX_FILE_SIZE_MB: zod_1.z.coerce.number().default(5),
    LOG_LEVEL: zod_1.z.string().default('info'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
//# sourceMappingURL=env.js.map