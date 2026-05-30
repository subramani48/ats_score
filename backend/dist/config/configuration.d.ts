declare const _default: () => {
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
    JWT_EXPIRES_IN: string;
    FRONTEND_URL: string;
    MAX_FILE_SIZE_MB: number;
    TELEGRAM_BOT_TOKEN?: string | undefined;
    TELEGRAM_ADMIN_CHAT_ID?: string | undefined;
};
export default _default;
