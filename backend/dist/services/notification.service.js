"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResumeToAdmin = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const logger_1 = require("../lib/logger");
const sendResumeToAdmin = async (fileName, meta) => {
    if (!env_1.env.TELEGRAM_BOT_TOKEN || !env_1.env.TELEGRAM_ADMIN_CHAT_ID)
        return;
    const message = `
📄 *New Resume Submission*
👤 Name: ${meta.name}
📧 Email: ${meta.email}
🎯 Domain: ${meta.domain}
📊 Score: ${meta.score}
📎 File: ${fileName}
🕐 Time: ${new Date().toLocaleString()}
  `.trim();
    try {
        await axios_1.default.post(`https://api.telegram.org/bot${env_1.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: env_1.env.TELEGRAM_ADMIN_CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
        });
    }
    catch (err) {
        logger_1.logger.warn({ message: 'Telegram notification failed', error: err.message });
    }
};
exports.sendResumeToAdmin = sendResumeToAdmin;
//# sourceMappingURL=notification.service.js.map