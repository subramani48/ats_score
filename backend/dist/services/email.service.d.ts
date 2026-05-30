import type { AnalysisResult } from '../types';
export declare const sendAnalysisEmail: (name: string, email: string, result: AnalysisResult) => Promise<boolean>;
export declare const sendRewriteEmail: (name: string, email: string, rewrittenText: string) => Promise<boolean>;
