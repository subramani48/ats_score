import { InterviewService } from './interview.service';
import { GenerateInterviewDto } from './dto/generate-interview.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
export declare class InterviewController {
    private readonly service;
    constructor(service: InterviewService);
    generate(dto: GenerateInterviewDto, user: AuthUser | null): Promise<{
        success: boolean;
        data: {
            id: string;
            questions: unknown;
            domain: string;
            difficulty: "easy" | "medium" | "hard";
            createdAt: Date;
        };
    }>;
    getHistory(user: AuthUser): Promise<{
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
