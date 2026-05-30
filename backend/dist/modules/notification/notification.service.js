"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let NotificationService = NotificationService_1 = class NotificationService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(NotificationService_1.name);
    }
    async sendToAdmin(buffer, fileName, mimeType, meta) {
        const botToken = this.config.get('TELEGRAM_BOT_TOKEN');
        const chatId = this.config.get('TELEGRAM_ADMIN_CHAT_ID');
        if (!botToken || !chatId)
            return;
        const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const message = [
            '📄 <b>New Resume Submission</b>',
            `👤 Name: ${esc(meta.name)}`,
            `📧 Email: ${esc(meta.email)}`,
            `🎯 Domain: ${esc(meta.domain)}`,
            `📊 Score: ${esc(meta.score)}`,
            `📎 File: ${esc(fileName)}`,
            `🕐 Time: ${esc(new Date().toLocaleString())}`,
        ].join('\n');
        try {
            if (buffer) {
                const formData = new FormData();
                formData.append('chat_id', chatId);
                const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
                formData.append('document', blob, fileName);
                formData.append('caption', message);
                formData.append('parse_mode', 'HTML');
                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Telegram API returned status ${response.status}: ${errText}`);
                }
            }
            else {
                await axios_1.default.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                });
            }
        }
        catch (err) {
            this.logger.warn(`Telegram notification failed: ${err.message}`);
        }
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map