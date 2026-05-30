import { GeminiService } from '../ai/gemini.service';
import { CompanyAtsDto } from './dto/company-ats.dto';
export declare class CompanyAtsController {
    private readonly gemini;
    constructor(gemini: GeminiService);
    analyze(dto: CompanyAtsDto): Promise<{
        success: boolean;
        data: unknown;
    }>;
}
