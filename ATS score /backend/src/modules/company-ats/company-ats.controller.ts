import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GeminiService } from '../ai/gemini.service';
import { CompanyAtsDto } from './dto/company-ats.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Every call uses AI quota, so login is required and one visitor is limited to 20 calls per 15 minutes.
@Controller('company-ats')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 15 * 60 * 1000, limit: 20 } })
export class CompanyAtsController {
  constructor(private readonly gemini: GeminiService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyze(@Body() dto: CompanyAtsDto) {
    const result = await this.gemini.companyAtsAnalysis(dto.resumeText, dto.company, dto.role);
    return { success: true, data: result };
  }
}
