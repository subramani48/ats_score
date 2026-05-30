"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    TELEGRAM_BOT_TOKEN: zod_1.z.string().optional(),
    TELEGRAM_ADMIN_CHAT_ID: zod_1.z.string().optional(),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:3000'),
    MAX_FILE_SIZE_MB: zod_1.z.coerce.number().default(5),
});
exports.default = () => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('Invalid environment variables:');
        console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
        process.exit(1);
    }
    return result.data;
};
//# sourceMappingURL=configuration.js.map