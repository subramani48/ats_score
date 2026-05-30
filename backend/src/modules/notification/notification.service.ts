import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface AdminMeta {
  name: string;
  email: string;
  domain: string;
  score: number | string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly config: ConfigService) {}

  async sendToAdmin(
    buffer: Buffer | null,
    fileName: string,
    mimeType: string,
    meta: AdminMeta,
  ): Promise<void> {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID');
    if (!botToken || !chatId) return;

    const esc = (s: string | number) =>
      String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
      } else {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        });
      }
    } catch (err) {
      this.logger.warn(`Telegram notification failed: ${(err as Error).message}`);
    }
  }
}

