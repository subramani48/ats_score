const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

interface ApiOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(init.body instanceof FormData) && init.method && init.method !== 'GET') {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }
  const res = await fetch(`${BASE_URL}/api/v1${path}`, { ...init, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? data?.message ?? 'API error');
  return data as T;
}

export const api = {
  // ── Resume ──────────────────────────────────────────────────
  uploadResume: (form: FormData, token?: string) =>
    apiFetch<{ success: boolean; jobId: string }>('/resumes', { method: 'POST', body: form, token }),

  getJobStatus: (jobId: string) =>
    apiFetch<{ state: string; progress: unknown; result: unknown }>(`/resumes/jobs/${jobId}/status`),

  // ── Analysis ────────────────────────────────────────────────
  getAnalysis: (id: string, token?: string) =>
    apiFetch<{ success: boolean; data: Analysis }>(`/analyses/${id}`, { token }),

  getUserHistory: (token: string) =>
    apiFetch<{ success: boolean; data: Analysis[] }>('/analyses/history', { token }),

  getUserAnalytics: (token: string) =>
    apiFetch<{ success: boolean; data: AnalyticsData }>('/analyses/analytics', { token }),

  compareAnalyses: (ids: string[], token?: string) =>
    apiFetch<{ success: boolean; data: Analysis[] }>(`/analyses/compare?ids=${ids.join(',')}`, { token }),

  getPeerBenchmark: (domain: string, score: number) =>
    apiFetch<{ success: boolean; data: PeerBenchmark }>(
      `/analyses/benchmark?domain=${encodeURIComponent(domain)}&score=${score}`,
    ),

  // ── Auth ────────────────────────────────────────────────────
  register: (body: { email: string; name: string; password: string }) =>
    apiFetch<AuthResponse>('/users/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/users/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: (token: string) =>
    apiFetch<{ success: boolean; data: UserProfile }>('/users/me', { token }),

  // ── Cover Letter ────────────────────────────────────────────
  generateCoverLetter: (body: CoverLetterRequest, token?: string) =>
    apiFetch<{ success: boolean; data: { id: string; generatedText: string; createdAt: string } }>(
      '/cover-letters/generate',
      { method: 'POST', body: JSON.stringify(body), token },
    ),

  getCoverLetterHistory: (token: string) =>
    apiFetch<{ success: boolean; data: CoverLetterHistory[] }>('/cover-letters/history', { token }),

  // ── Interview ───────────────────────────────────────────────
  generateInterviewQuestions: (body: InterviewRequest, token?: string) =>
    apiFetch<{ success: boolean; data: InterviewResult }>(
      '/interview/generate',
      { method: 'POST', body: JSON.stringify(body), token },
    ),

  // ── Batch Analysis ──────────────────────────────────────────
  batchAnalyze: (body: BatchRequest, token?: string) =>
    apiFetch<{ success: boolean; data: BatchResult }>(
      '/batch/analyze',
      { method: 'POST', body: JSON.stringify(body), token },
    ),

  // ── Company ATS ─────────────────────────────────────────────
  companyAtsAnalysis: (body: { resumeText: string; company: string; role: string }, token?: string) =>
    apiFetch<{ success: boolean; data: CompanyAtsResult }>(
      '/company-ats/analyze',
      { method: 'POST', body: JSON.stringify(body), token },
    ),

  // ── Job Scraper ─────────────────────────────────────────────
  fetchJobFromUrl: (url: string, token?: string) =>
    apiFetch<{ title: string; company: string; description: string }>(
      '/scraper/fetch-jd',
      { method: 'POST', body: JSON.stringify({ url }), token },
    ),

  // ── Notifications ────────────────────────────────────────────
  getNotifications: (token: string) =>
    apiFetch<{ success: boolean; data: { notifications: AppNotification[]; unreadCount: number } }>(
      '/notifications',
      { token },
    ),

  markAllRead: (token: string) =>
    apiFetch<{ success: true }>('/notifications/read-all', { method: 'PATCH', token }),

  // ── API Keys ─────────────────────────────────────────────────
  createApiKey: (name: string, token: string) =>
    apiFetch<{ success: boolean; data: { id: string; key: string; name: string; createdAt: string } }>(
      '/api-keys',
      { method: 'POST', body: JSON.stringify({ name }), token },
    ),

  listApiKeys: (token: string) =>
    apiFetch<{ success: boolean; data: ApiKeyEntry[] }>('/api-keys', { token }),

  revokeApiKey: (id: string, token: string) =>
    apiFetch<{ success: boolean }>(`/api-keys/${id}`, { method: 'DELETE', token }),

  // ── Admin ────────────────────────────────────────────────────
  getAdminStats: (token: string) =>
    apiFetch<{ success: boolean; data: AdminStats }>('/admin/stats', { token }),

  // ── LinkedIn Import ──────────────────────────────────────────
  importLinkedIn: (input: string, token?: string) =>
    apiFetch<{ success: boolean; data: LinkedInProfile }>('/scraper/linkedin-import', {
      method: 'POST',
      body: JSON.stringify({ input }),
      token,
    }),

  // ── Version Control ──────────────────────────────────────────
  getResumeVersions: (resumeId: string, token: string) =>
    apiFetch<{ success: boolean; data: ResumeVersion[] }>(`/versions/resume/${resumeId}`, { token }),

  createSnapshot: (resumeId: string, label: string | undefined, token: string) =>
    apiFetch<{ success: boolean; data: ResumeVersion }>(`/versions/resume/${resumeId}/snapshot`, {
      method: 'POST', body: JSON.stringify({ label }), token,
    }),

  compareVersions: (ids: string[], token: string) =>
    apiFetch<{ success: boolean; data: ResumeVersion[] }>(`/versions/compare?ids=${ids.join(',')}`, { token }),

  // ── Stream URL ───────────────────────────────────────────────
  streamUrl: (jobId: string) => `${BASE_URL}/api/v1/resumes/jobs/${jobId}/stream`,
};

// ── Shared Types ─────────────────────────────────────────────────────────────

export interface Analysis {
  id: string;
  mode: 'analyze' | 'rewrite';
  domain: string;
  score: number | null;
  breakdown: { keywordScore: number; achievementScore: number; formattingScore: number; readabilityScore: number } | null;
  keywordsMatched: string[];
  keywordsMissed: string[];
  suggestions: string[];
  warnings: string[];
  keywordGap: KeywordGapResult | null;
  rewrittenText: string | null;
  jobDescription: string | null;
  emailSent: boolean;
  processingMs: number | null;
  createdAt: string;
  resume: { originalName: string };
}

export interface KeywordGapResult {
  criticalMissing: string[];
  nicetohaveMissing: string[];
  presentKeywords: string[];
  keywordDensityIssues: string[];
  overusedPhrases: string[];
  recommendedAdditions: Array<{ keyword: string; where: string; example: string }>;
}

export interface AnalyticsData {
  totalAnalyses: number;
  avgScore: number;
  scoreImprovement: number;
  topMissingKeywords: Array<{ keyword: string; count: number }> | string[];
  scoreOverTime: Array<{ date: string; score: number; domain?: string }>;
  bestScore: { score: number; analysisId: string };
}

export interface PeerBenchmark {
  percentile: number | null;
  avgDomainScore: number | null;
  totalSamples: number;
  userScore: number;
  domain: string;
  message: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  provider: string;
  createdAt: string;
}

export interface CoverLetterRequest {
  resumeText: string;
  jobDescription: string;
  companyName?: string;
  role?: string;
  tone?: 'professional' | 'enthusiastic' | 'concise';
}

export interface CoverLetterHistory {
  id: string;
  companyName: string | null;
  role: string | null;
  tone: string;
  generatedText: string;
  createdAt: string;
}

export interface InterviewRequest {
  resumeText: string;
  jobDescription: string;
  domain: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface InterviewQuestion {
  question: string;
  why?: string;
  hint?: string;
  expectedAnswer?: string;
  difficulty?: string;
}

export interface InterviewResult {
  id: string;
  domain: string;
  difficulty: string;
  questions: {
    behavioral: InterviewQuestion[];
    technical: InterviewQuestion[];
    situational: InterviewQuestion[];
    aboutYou: InterviewQuestion[];
    companySpecific: InterviewQuestion[];
  };
  createdAt: string;
}

export interface BatchRequest {
  resumeText: string;
  jobDescriptions: Array<{ title: string; company?: string; jd: string }>;
  domain: string;
}

export interface BatchResult {
  batchId: string;
  totalJDs: number;
  completedJDs: number;
  results: Array<{
    title: string;
    company?: string | null;
    keywordGap: KeywordGapResult | null;
    companyAnalysis: CompanyAtsResult | null;
    error?: string | null;
  }>;
}

export interface CompanyAtsResult {
  companyFitScore: number;
  cultureFitKeywords: string[];
  missingForCompany: string[];
  presentForCompany: string[];
  recommendations: string[];
  interviewTips: string[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface ApiKeyEntry {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  usageCount: number;
  lastUsed: string | null;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalAnalyses: number;
  totalCoverLetters: number;
  totalInterviews: number;
  avgScore: number;
  topDomains: Array<{ domain: string; count: number }>;
  recentAnalyses: Array<{
    id: string;
    domain: string;
    score: number | null;
    mode: string;
    createdAt: string;
    resume: { originalName: string };
  }>;
  analysesPerDay: Array<{ date: string; count: number }>;
}

export interface LinkedInProfile {
  name: string;
  headline: string;
  about: string;
  experience: string;
  education: string;
  skills: string[];
  rawText: string;
}

export interface ResumeVersion {
  id: string;
  resumeId: string;
  versionNum: number;
  label: string | null;
  score: number | null;
  domain: string | null;
  extractedText?: string;
  createdAt: string;
}
