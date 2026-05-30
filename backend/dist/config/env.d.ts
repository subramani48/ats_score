export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    DATABASE_URL: string;
    REDIS_URL: string;
    GEMINI_API_KEY: string;
    SMTP_HOST: string;
    SMTP_PORT: number;
    SMTP_USER: string;
    SMTP_PASS: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
    MAX_FILE_SIZE_MB: number;
    LOG_LEVEL: string;
    TELEGRAM_BOT_TOKEN?: string | undefined;
    TELEGRAM_ADMIN_CHAT_ID?: string | undefined;
};
