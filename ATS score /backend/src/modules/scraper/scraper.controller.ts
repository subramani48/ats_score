import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, IsUrl, IsOptional } from 'class-validator';
import { ScraperService } from './scraper.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class ScrapeUrlDto {
  @IsString()
  @IsUrl()
  url!: string;
}

class LinkedInImportDto {
  @IsString()
  input!: string; // URL or raw pasted text

  @IsOptional()
  @IsString()
  format?: 'url' | 'text';
}

// Login required, so the server cannot be used as an anonymous page fetcher. Stricter than the
// site-wide limit because every call makes the server contact another website.
@Controller('scraper')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 15 * 60 * 1000, limit: 20 } })
export class ScraperController {
  constructor(private readonly service: ScraperService) {}

  @Post('fetch-jd')
  @HttpCode(HttpStatus.OK)
  fetchJD(@Body() body: ScrapeUrlDto) {
    return this.service.fetchJobDescription(body.url);
  }

  @Post('linkedin-import')
  @HttpCode(HttpStatus.OK)
  importLinkedIn(@Body() body: LinkedInImportDto) {
    return this.service.importLinkedIn(body.input);
  }
}
