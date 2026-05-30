import type { AnalysisResult } from '../../types';
export declare class AnalyzerService {
    private detectSections;
    private formattingWarnings;
    private readabilityScore;
    analyze(text: string, domain: string): AnalysisResult;
}
