export declare class JdEntryDto {
    title: string;
    company?: string;
    jd: string;
}
export declare class BatchAnalyzeDto {
    resumeText: string;
    jobDescriptions: JdEntryDto[];
    domain: string;
}
