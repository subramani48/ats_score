import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import type { GenerateCoverLetterDto } from './dto/generate-cover-letter.dto';
export declare class CoverLetterService {
    private readonly prisma;
    private readonly gemini;
    constructor(prisma: PrismaService, gemini: GeminiService);
    generate(dto: GenerateCoverLetterDto, userId?: string): Promise<{
        success: boolean;
        data: {
            id: string;
            generatedText: string;
            createdAt: Date;
        };
    }>;
    getUserHistory(userId: string): Promise<{
        success: boolean;
        data: {
            id: string;
            role: string | null;
            createdAt: Date;
            companyName: string | null;
            generatedText: string;
            tone: string;
        }[];
    }>;
}
