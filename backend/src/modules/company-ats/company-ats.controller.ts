import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { CompanyAtsDto } from './dto/company-ats.dto';

@Controller('company-ats')
export class CompanyAtsController {
  constructor(private readonly gemini: GeminiService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyze(@Body() dto: CompanyAtsDto) {
    const result = await this.gemini.companyAtsAnalysis(dto.resumeText, dto.company, dto.role);
    return { success: true, data: result };
  }
}
