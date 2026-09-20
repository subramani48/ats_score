// Where the backend lives. Set NEXT_PUBLIC_API_URL for anything other than local development.
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

interface ApiOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
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

  // ── Mock Interview ───────────────────────────────────────────
  startMockInterview: (body: StartMockRequest, token: string) =>
    apiFetch<{ success: boolean; data: MockInterviewSession }>('/mock-interviews/start', {
      method: 'POST', body: JSON.stringify(body), token,
    }),

  submitMockAnswer: (id: string, body: { answer: string; delivery?: MockDelivery }, token: string) =>
    apiFetch<{ success: boolean; data: MockInterviewSession }>(`/mock-interviews/${id}/answer`, {
      method: 'POST', body: JSON.stringify(body), token,
    }),

  finishMockInterview: (id: string, token: string) =>
    apiFetch<{ success: boolean; data: MockInterviewSession }>(`/mock-interviews/${id}/finish`, {
      method: 'POST', token,
    }),

  getMockInterview: (id: string, token: string) =>
    apiFetch<{ success: boolean; data: MockInterviewSession }>(`/mock-interviews/${id}`, { token }),

  listMockInterviews: (token: string) =>
    apiFetch<{ success: boolean; data: MockInterviewSummary[] }>('/mock-interviews', { token }),

  // ── STAR Stories ─────────────────────────────────────────────
  generateStarStories: (body: { resumeText: string; count?: number }, token: string) =>
    apiFetch<{ success: boolean; data: StarStory[] }>('/star-stories/generate', {
      method: 'POST', body: JSON.stringify(body), token,
    }),

  listStarStories: (token: string) =>
    apiFetch<{ success: boolean; data: StarStory[] }>('/star-stories', { token }),

  updateStarStory: (id: string, body: Partial<Pick<StarStory, 'title' | 'situation' | 'task' | 'action' | 'result'>>, token: string) =>
    apiFetch<{ success: boolean; data: StarStory }>(`/star-stories/${id}`, {
      method: 'PATCH', body: JSON.stringify(body), token,
    }),

  deleteStarStory: (id: string, token: string) =>
    apiFetch<{ success: boolean }>(`/star-stories/${id}`, { method: 'DELETE', token }),

  matchStarStory: (question: string, token: string) =>
    apiFetch<{ success: boolean; data: StarMatchResult }>('/star-stories/match', {
      method: 'POST', body: JSON.stringify({ question }), token,
    }),

  // ── Battle Card ──────────────────────────────────────────────
  generateBattleCard: (body: BattleCardRequest, token: string) =>
    apiFetch<{ success: boolean; data: BattleCard }>('/battle-cards/generate', {
      method: 'POST', body: JSON.stringify(body), token,
    }),

  listBattleCards: (token: string) =>
    apiFetch<{ success: boolean; data: Array<{ id: string; company: string; role: string; createdAt: string }> }>(
      '/battle-cards', { token },
    ),

  getBattleCard: (id: string, token: string) =>
    apiFetch<{ success: boolean; data: BattleCard }>(`/battle-cards/${id}`, { token }),

  deleteBattleCard: (id: string, token: string) =>
    apiFetch<{ success: boolean }>(`/battle-cards/${id}`, { method: 'DELETE', token }),

  // ── Applications ─────────────────────────────────────────────
  createApplication: (body: ApplicationInput, token: string) =>
    apiFetch<{ success: boolean; data: JobApplication }>('/applications', {
      method: 'POST', body: JSON.stringify(body), token,
    }),

  listApplications: (token: string) =>
    apiFetch<{ success: boolean; data: JobApplication[] }>('/applications', { token }),

  updateApplication: (id: string, body: Partial<ApplicationInput>, token: string) =>
    apiFetch<{ success: boolean; data: JobApplication }>(`/applications/${id}`, {
      method: 'PATCH', body: JSON.stringify(body), token,
    }),

  deleteApplication: (id: string, token: string) =>
    apiFetch<{ success: boolean }>(`/applications/${id}`, { method: 'DELETE', token }),

  getApplicationStats: (token: string) =>
    apiFetch<{ success: boolean; data: ApplicationStats }>('/applications/stats', { token }),

  draftFollowUp: (id: string, body: { type: FollowUpType; interviewerName?: string; context?: string }, token: string) =>
    apiFetch<{ success: boolean; data: { subject: string; body: string } }>(`/applications/${id}/follow-up`, {
      method: 'POST', body: JSON.stringify(body), token,
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

  // ── Subscription ─────────────────────────────────────────────
  getSubscriptionTier: (token: string) =>
    apiFetch<{ success: boolean; data: SubscriptionTier }>('/subscription/tier', { token }),

  // ── Stream URL ───────────────────────────────────────────────
  streamUrl: (jobId: string) => `${BASE_URL}/api/v1/resumes/jobs/${jobId}/stream`,
};

// ── Shared Types ─────────────────────────────────────────────────────────────

export interface SubscriptionTier {
  tier: 'free' | 'pro' | 'enterprise';
  limits: { analysesPerMonth: number; coverLettersPerMonth: number; interviewsPerMonth: number };
  usage: { analyses: number; coverLetters: number; interviews: number };
  remaining: { analyses: number; coverLetters: number; interviews: number };
}

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

// ── Interview Pro Types ──────────────────────────────────────────────────────

export interface StartMockRequest {
  role: string;
  company?: string;
  domain: string;
  resumeText: string;
  jobDescription?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  persona?: 'friendly' | 'neutral' | 'tough';
  totalQuestions?: number;
}

export interface MockDelivery {
  durationSec?: number;
  wordsPerMinute?: number;
  fillerCount?: number;
}

export interface MockEvaluation {
  scores: { relevance: number; structure: number; depth: number; clarity: number; confidence: number };
  overall: number;
  strengths: string[];
  improvements: string[];
  betterAnswer: string;
  deliveryNote?: string;
}

export interface MockTurn {
  question: string;
  category: string;
  answer?: string;
  delivery?: MockDelivery;
  evaluation?: MockEvaluation;
}

export interface MockReport {
  readinessScore: number;
  verdict: string;
  categoryScores: { communication: number; structure: number; technicalDepth: number; relevance: number; confidence: number };
  strengths: string[];
  topFixes: Array<{ issue: string; fix: string }>;
  practicePlan: Array<{ day: number; focus: string; task: string }>;
}

export interface MockInterviewSession {
  id: string;
  role: string;
  company: string | null;
  domain: string;
  difficulty: string;
  persona: string;
  totalQuestions: number;
  status: 'active' | 'completed';
  turns: MockTurn[];
  report: MockReport | null;
  createdAt: string;
}

export interface MockInterviewSummary {
  id: string;
  role: string;
  company: string | null;
  status: string;
  readinessScore: number | null;
  createdAt: string;
}

export interface StarStory {
  id: string;
  title: string;
  competencies: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics: string[];
  followUps: string[];
  createdAt: string;
}

export interface StarMatchResult {
  matches: Array<{ story: StarStory; fitScore: number; whyItFits: string; howToAdapt: string; openingLine: string }>;
  gap: string;
}

export interface BattleCardRequest {
  company: string;
  role: string;
  jobDescription?: string;
  resumeText?: string;
  experienceYears?: number;
  location?: string;
}

export interface BattleCardContent {
  companySnapshot: string;
  likelyRounds: Array<{ name: string; format: string; whatTheyTest: string; prepTips: string[] }>;
  topQuestions: Array<{ question: string; angle: string }>;
  questionsToAsk: string[];
  redFlagsToProbe: string[];
  talkingPoints: string[];
  salaryNegotiation: {
    researchSteps: string[];
    anchoringScript: string;
    counterOfferScript: string;
    beyondBaseSalary: string[];
    avoid: string[];
  };
  first90Days: Array<{ phase: string; goals: string[] }>;
  disclaimer: string;
}

export interface BattleCard {
  id: string;
  company: string;
  role: string;
  content: BattleCardContent;
  createdAt: string;
}

export type ApplicationStatus = 'wishlist' | 'applied' | 'screening' | 'interview' | 'offer' | 'accepted' | 'rejected';
export type FollowUpType = 'thank-you' | 'follow-up' | 'negotiation' | 'decline';

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  jobUrl: string | null;
  status: ApplicationStatus;
  appliedAt: string | null;
  nextStepAt: string | null;
  salaryOffered: number | null;
  notes: string | null;
  updatedAt: string;
}

export interface ApplicationInput {
  company: string;
  role: string;
  jobUrl?: string;
  status?: ApplicationStatus;
  appliedAt?: string;
  nextStepAt?: string;
  salaryOffered?: number;
  notes?: string;
}

export interface ApplicationStats {
  counts: Record<ApplicationStatus, number>;
  total: number;
  applied: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  upcoming: Array<{ id: string; company: string; role: string; status: string; nextStepAt: string }>;
}
