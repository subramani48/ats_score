import { ScraperService } from './scraper.service';
declare class ScrapeUrlDto {
    url: string;
}
declare class LinkedInImportDto {
    input: string;
    format?: 'url' | 'text';
}
export declare class ScraperController {
    private readonly service;
    constructor(service: ScraperService);
    fetchJD(body: ScrapeUrlDto): Promise<{
        title: string;
        company: string;
        description: string;
    }>;
    importLinkedIn(body: LinkedInImportDto): Promise<{
        success: boolean;
        data: {
            name: string;
            headline: string;
            about: string;
            experience: string;
            education: string;
            skills: string[];
            rawText: string;
        };
    }>;
}
export {};
