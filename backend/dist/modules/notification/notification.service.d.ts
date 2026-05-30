import { ConfigService } from '@nestjs/config';
interface AdminMeta {
    name: string;
    email: string;
    domain: string;
    score: number | string;
}
export declare class NotificationService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    sendToAdmin(buffer: Buffer | null, fileName: string, mimeType: string, meta: AdminMeta): Promise<void>;
}
export {};
