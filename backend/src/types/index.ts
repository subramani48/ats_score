export type AnalysisMode = 'analyze' | 'rewrite';

export interface ScoreBreakdown {
  keywordScore: number;
  achievementScore: number;
  formattingScore: number;
  readabilityScore: number;
}

export interface SectionDetected {
  summary: boolean;
  experience: boolean;
  education: boolean;
  skills: boolean;
  projects: boolean;
}

export interface AnalysisResult {
  score: number;
  breakdown: ScoreBreakdown;
  matchedKeywords: string[];
  missingKeywords: string[];
  keywordDensity: number;
  sectionsDetected: SectionDetected;
  warnings: string[];
  suggestions: string[];
  keywordGap?: KeywordGapResult;
}

export interface KeywordGapResult {
  criticalMissing: string[];
  nicetohaveMissing: string[];
  presentKeywords: string[];
  keywordDensityIssues: string[];
  overusedPhrases: string[];
  recommendedAdditions: Array<{
    keyword: string;
    where: string;
    example: string;
  }>;
}

export interface AnalysisJobPayload {
  resumeBuffer: Buffer | string;
  mode: AnalysisMode;
  domain: string;
  jobDescription?: string;
  userId?: string;
  name: string;
  email: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface JobProgressData {
  step: string;
  percent: number;
  message: string;
}
