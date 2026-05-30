import { ConfigService } from '@nestjs/config';
import type { AnalysisResult } from '../../types';
export declare class EmailService {
    private readonly config;
    private readonly logger;
    private readonly transporter;
    constructor(config: ConfigService);
    sendAnalysisEmail(name: string, email: string, result: AnalysisResult): Promise<boolean>;
    sendRewriteEmail(name: string, email: string, rewrittenText: string): Promise<boolean>;
}
