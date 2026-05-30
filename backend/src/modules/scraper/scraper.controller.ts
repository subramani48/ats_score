import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, IsUrl, IsOptional } from 'class-validator';
import { ScraperService } from './scraper.service';

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

@Controller('scraper')
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
