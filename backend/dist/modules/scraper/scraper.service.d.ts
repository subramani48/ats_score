export declare class ScraperService {
    private readonly logger;
    importLinkedIn(input: string): Promise<{
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
    fetchJobDescription(url: string): Promise<{
        title: string;
        company: string;
        description: string;
    }>;
}
