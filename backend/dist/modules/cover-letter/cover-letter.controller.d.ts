import { CoverLetterService } from './cover-letter.service';
import { GenerateCoverLetterDto } from './dto/generate-cover-letter.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
export declare class CoverLetterController {
    private readonly service;
    constructor(service: CoverLetterService);
    generate(dto: GenerateCoverLetterDto, user: AuthUser | null): Promise<{
        success: boolean;
        data: {
            id: string;
            generatedText: string;
            createdAt: Date;
        };
    }>;
    getHistory(user: AuthUser): Promise<{
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
