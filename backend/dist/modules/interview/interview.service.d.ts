import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import type { GenerateInterviewDto } from './dto/generate-interview.dto';
export declare class InterviewService {
    private readonly prisma;
    private readonly gemini;
    constructor(prisma: PrismaService, gemini: GeminiService);
    generate(dto: GenerateInterviewDto, userId?: string): Promise<{
        success: boolean;
        data: {
            id: string;
            questions: unknown;
            domain: string;
            difficulty: "easy" | "medium" | "hard";
            createdAt: Date;
        };
    }>;
    getUserHistory(userId: string): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            domain: string;
            questions: import("@prisma/client/runtime/client").JsonValue;
            difficulty: string;
        }[];
    }>;
}
