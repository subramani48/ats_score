# ATS Resume Analyzer — Backend: Complete Project Documentation

> Generated: 2026-05-13  
> Covers: Full rewrite from plain JS monolith → production-grade TypeScript microservice

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Original vs New Architecture](#2-original-vs-new-architecture)
3. [Complete Folder Structure](#3-complete-folder-structure)
4. [Technology Stack](#4-technology-stack)
5. [Environment Variables](#5-environment-variables)
6. [Database — Prisma v7 + PostgreSQL](#6-database--prisma-v7--postgresql)
7. [Authentication Flow — JWT](#7-authentication-flow--jwt)
8. [ATS Scoring Engine](#8-ats-scoring-engine)
9. [AI Integration — Gemini](#9-ai-integration--gemini)
10. [Async Queue Architecture — BullMQ + Redis](#10-async-queue-architecture--bullmq--redis)
11. [SSE Real-Time Streaming](#11-sse-real-time-streaming)
12. [API Reference](#12-api-reference)
13. [Middleware Stack](#13-middleware-stack)
14. [Email & Notifications](#14-email--notifications)
15. [Error Handling](#15-error-handling)
16. [Logging](#16-logging)
17. [Docker & Infrastructure](#17-docker--infrastructure)
18. [CI/CD — GitHub Actions](#18-cicd--github-actions)
19. [How to Run](#19-how-to-run)
20. [Key Decisions & Gotchas](#20-key-decisions--gotchas)

---

## 1. Project Overview

The ATS Resume Analyzer backend is a REST API that accepts resume uploads (PDF/DOCX), scores them against domain-specific ATS criteria, optionally rewrites them using Gemini AI, and streams real-time progress back to the client via Server-Sent Events.

**Core capabilities:**
- Upload resume → async processing via Redis queue
- 4-dimension ATS scoring across 12 job domains
- AI keyword gap analysis (Gemini)
- AI resume rewriting (Gemini)
- AI chat about your resume (streaming)
- User accounts, JWT auth, resume history
- Analytics dashboard data (score trends, improvements)
- Email delivery of results (SMTP)
- Telegram admin notifications

---

## 2. Original vs New Architecture

### Original (plain JS monolith)

```
backend/
├── server.js                  # Everything in one file
├── controllers/
│   └── uploadController.js    # All analysis logic here
├── services/
│   ├── aiService.js           # Single Gemini call, no retry
│   ├── analyzerService.js     # Simple keyword count only
│   └── emailService.js        # Synchronous, blocks response
├── config/
│   └── keywords.json          # 8 domains, ~10 keywords each
├── .env
└── package.json
```

**Problems:**
- No TypeScript — runtime errors not caught at compile time
- No database — results lost after response
- No auth — anyone can access everything
- Synchronous processing — large files timeout
- No retry logic on AI calls — single failure = job lost
- Open CORS — any origin accepted
- No rate limiting — DDoS vulnerable
- 8 domains × 10 keywords = weak matching

### New (TypeScript + layered architecture)

- Full TypeScript with `strict: true`
- PostgreSQL via Prisma v7 ORM
- BullMQ + Redis for async job processing
- JWT authentication with bcrypt hashing
- SSE real-time progress streaming
- 12 domains × 20 keywords = 3× better matching
- 4-dimension scoring (not just keyword count)
- Gemini AI with 3-retry exponential backoff
- Helmet + CORS + rate limiting
- Winston structured logging
- Docker multi-stage builds

---

## 3. Complete Folder Structure

```
backend/
├── prisma/
│   └── schema.prisma              # Prisma v7 schema (no url in datasource)
├── prisma.config.ts               # Prisma v7 config — DATABASE_URL + adapter
├── src/
│   ├── server.ts                  # Express app entry point
│   ├── config/
│   │   ├── env.ts                 # Zod v4 env validation
│   │   ├── database.ts            # Prisma client with pg adapter
│   │   └── redis.ts               # ioredis client
│   ├── lib/
│   │   ├── logger.ts              # Winston structured logger
│   │   └── errors.ts              # Custom error classes
│   ├── types/
│   │   ├── index.ts               # Shared TypeScript types + Express augmentation
│   │   └── pdf-parse.d.ts         # Manual type declarations for pdf-parse
│   ├── middleware/
│   │   ├── errorHandler.middleware.ts
│   │   ├── requestLogger.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── auth.middleware.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── resume.repository.ts
│   │   └── analysis.repository.ts
│   ├── services/
│   │   ├── resume/
│   │   │   ├── parser.service.ts  # PDF + DOCX text extraction
│   │   │   └── analyzer.service.ts# 4-dimension ATS scoring engine
│   │   ├── ai/
│   │   │   ├── prompts/
│   │   │   │   └── keyword-gap.ts # Gemini prompt templates
│   │   │   └── gemini.service.ts  # Gemini AI client + retry logic
│   │   ├── queue/
│   │   │   ├── queue.service.ts   # BullMQ Queue + enqueueAnalysis
│   │   │   └── workers/
│   │   │       └── analysis.worker.ts # BullMQ Worker (concurrency=5)
│   │   ├── email.service.ts       # Nodemailer SMTP
│   │   └── notification.service.ts# Telegram Bot API
│   ├── controllers/
│   │   ├── resume.controller.ts   # Upload, job status, SSE stream
│   │   ├── analysis.controller.ts # History, analytics, compare, chat
│   │   └── user.controller.ts     # Register, login, me
│   └── api/
│       └── v1/
│           ├── index.ts           # Combines all routes under /api/v1
│           └── routes/
│               ├── resume.routes.ts
│               ├── analysis.routes.ts
│               └── user.routes.ts
├── logs/                          # Auto-created by Winston
│   ├── error.log
│   └── combined.log
├── .env                           # Actual secrets (gitignored)
├── .env.example                   # Template — all keys, no values
├── tsconfig.json
├── package.json
└── Dockerfile                     # Multi-stage production build
```

---

## 4. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Language | TypeScript | 5.x | Type safety, compile-time checks |
| Runtime | Node.js | 20+ | Server runtime |
| Framework | Express | 5.x | HTTP server |
| ORM | Prisma | 7.x | Database client |
| Database | PostgreSQL | 16 | Persistent storage |
| Cache/Queue | Redis | 7 | BullMQ job broker |
| Job Queue | BullMQ | 5.x | Async job processing |
| AI | Google Gemini | 1.5 | Resume rewriting + analysis |
| Auth | jsonwebtoken | 9.x | JWT token signing/verification |
| Passwords | bcryptjs | 2.x | Password hashing (12 rounds) |
| Validation | Zod | 4.x | Env + input validation |
| Logging | Winston | 3.x | Structured logging |
| Email | Nodemailer | 6.x | SMTP email delivery |
| File Upload | Multer | 2.x | Multipart form parsing |
| PDF Parse | pdf-parse | 1.x | PDF text extraction |
| DOCX Parse | mammoth | 1.x | DOCX text extraction |
| HTTP Client | axios | 1.x | Telegram notifications |
| Security | Helmet | 8.x | 11 security headers |
| Rate Limit | express-rate-limit | 7.x | Request throttling |
| ID Gen | uuid | 9.x | Request correlation IDs |
| Compression | compression | 1.x | gzip response compression |

---

## 5. Environment Variables

File: `backend/.env` (copy from `.env.example`)

```env
# ── Application ──────────────────────────────
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# ── Database ─────────────────────────────────
DATABASE_URL=postgresql://postgres:smackcoders@localhost:5433/ats

# ── Redis ────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Authentication ────────────────────────────
JWT_SECRET=ats-analyzer-super-secret-jwt-key-2026

# ── Google Gemini AI ─────────────────────────
GEMINI_API_KEY=your_gemini_api_key_here

# ── Email (SMTP) ──────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_app_password

# ── Telegram Notifications ────────────────────
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_chat_id

# ── Limits ───────────────────────────────────
MAX_FILE_SIZE_MB=5
LOG_LEVEL=info
```

### Validation — `src/config/env.ts`

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  GEMINI_API_KEY: z.string().min(1),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  JWT_SECRET: z.string().min(16).default('ats-analyzer-dev-secret-32-chars!!'),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),
  LOG_LEVEL: z.string().default('info'),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
  process.exit(1);   // Hard fail at startup — no silent misconfiguration
}

export const env = result.data;
```

---

## 6. Database — Prisma v7 + PostgreSQL

### Prisma v7 Breaking Changes

Prisma v7 removed the `url` field from `datasource` in `schema.prisma`. Instead:
1. `schema.prisma` has no URL (no `url = env("DATABASE_URL")`)
2. A separate `prisma.config.ts` file at the project root holds the URL
3. The `@prisma/adapter-pg` package bridges Prisma to the native `pg` Pool

### `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  // No url here — Prisma v7 reads it from prisma.config.ts
}

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  name         String?
  passwordHash String?
  provider     String     @default("email")
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  analyses     Analysis[]
  resumes      Resume[]
}

model Resume {
  id            String     @id @default(cuid())
  userId        String?
  originalName  String
  mimeType      String
  sizeBytes     Int
  storagePath   String?
  extractedText String?    @db.Text
  createdAt     DateTime   @default(now())
  analyses      Analysis[]
  user          User?      @relation(fields: [userId], references: [id])
}

model Analysis {
  id              String   @id @default(cuid())
  userId          String?
  resumeId        String
  mode            String             // "analyze" | "rewrite"
  domain          String
  score           Int?               // 0–100
  keywordsMatched String[]
  keywordsMissed  String[]
  suggestions     String[]
  warnings        String[]
  breakdown       Json?              // ScoreBreakdown object
  keywordGap      Json?              // KeywordGapResult object
  rewrittenText   String?  @db.Text
  jobDescription  String?  @db.Text
  emailSent       Boolean  @default(false)
  processingMs    Int?
  createdAt       DateTime @default(now())
  resume          Resume   @relation(fields: [resumeId], references: [id])
  user            User?    @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([domain])
  @@index([createdAt])
}
```

### `prisma.config.ts` (project root — NOT inside src/)

```typescript
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/ats_analyzer',
  },
});
```

### `src/config/database.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from './env';

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development'
    ? ['query', 'warn', 'error']
    : ['warn', 'error'],
});
```

### Database Commands

```bash
npm run db:generate   # prisma generate (creates Prisma client)
npm run db:push       # prisma db push (sync schema → DB, dev only)
npm run db:migrate    # prisma migrate dev (create migration files)
npm run db:studio     # Open Prisma Studio on http://localhost:5555
```

---

## 7. Authentication Flow — JWT

### Registration Flow

```
POST /api/v1/users/register
  Body: { name, email, password }
  
  1. Check email not already taken (findByEmail)
  2. Hash password: bcrypt.hash(password, 12)
  3. Create User record in DB
  4. Sign JWT: jwt.sign({ sub: user.id, email }, JWT_SECRET, { expiresIn: '7d' })
  5. Return: { token, user: { id, email, name } }
```

### Login Flow

```
POST /api/v1/users/login
  Body: { email, password }
  
  1. Find user by email
  2. If not found → 401 Invalid credentials
  3. bcrypt.compare(password, user.passwordHash)
  4. If mismatch → 401 Invalid credentials
  5. Sign JWT (same as registration)
  6. Return: { token, user }
```

### Auth Middleware — `src/middleware/auth.middleware.ts`

The middleware reads the token from two sources:
- `Authorization: Bearer <token>` header
- `next-auth.session-token` cookie (Next.js Auth.js compatibility)

```typescript
export const requireAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.['next-auth.session-token'];
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) throw new UnauthorizedError();

  const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
  req.userId = payload.sub;
  next();
};

// optionalAuth: same but doesn't throw if no token
export const optionalAuth: RequestHandler = (req, _res, next) => {
  try { /* same as requireAuth but catches errors */ }
  catch { next(); }
};
```

### Token Usage in Requests

```typescript
// Frontend sends:
fetch('/api/v1/analyses/history', {
  headers: { Authorization: `Bearer ${token}` }
})

// Backend req.userId is populated for all protected routes
```

---

## 8. ATS Scoring Engine

File: `src/services/resume/analyzer.service.ts`

### Scoring Dimensions

| Dimension | Max Points | Description |
|---|---|---|
| Keywords | 40 | Domain-specific keyword matching |
| Achievements | 25 | Quantified accomplishments detected |
| Formatting | 20 | Structure, length, section presence |
| Readability | 15 | Sentence complexity, passive voice |
| **Total** | **100** | ATS pass threshold ≈ 70+ |

### Keyword Matching (0–40 points)

```typescript
// 12 job domains, 20 keywords each
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  'software-engineer': [
    'javascript', 'typescript', 'python', 'react', 'node.js',
    'rest api', 'microservices', 'docker', 'kubernetes', 'aws',
    'git', 'ci/cd', 'unit testing', 'agile', 'sql',
    'system design', 'algorithms', 'data structures', 'code review', 'devops'
  ],
  'data-scientist': [ /* 20 keywords */ ],
  'product-manager': [ /* 20 keywords */ ],
  'devops-engineer': [ /* 20 keywords */ ],
  'ux-designer': [ /* 20 keywords */ ],
  'marketing': [ /* 20 keywords */ ],
  'sales': [ /* 20 keywords */ ],
  'finance': [ /* 20 keywords */ ],
  'hr': [ /* 20 keywords */ ],
  'healthcare': [ /* 20 keywords */ ],
  'legal': [ /* 20 keywords */ ],
  'general': [ /* 20 keywords */ ],
};

// Scoring: (matched / total) * 40, capped at 40
const matchRatio = matchedKeywords.length / keywords.length;
const keywordScore = Math.round(matchRatio * 40);
```

### Achievement Detection (0–25 points)

Five regex patterns detect quantified impact:

```typescript
const ACHIEVEMENT_PATTERNS = [
  /\b\d+\s*%/,                          // "increased by 30%"
  /\$[\d,]+[kmb]?\b/i,                  // "$2.5M revenue"
  /\b(increased|decreased|improved|reduced|grew|saved)\b.*\b\d+/i,
  /\b\d+\+?\s*(users|customers|clients|employees|team members)\b/i,
  /\b(led|managed|built|launched|deployed|delivered)\b.*\b\d+/i,
];
```

Points: 5 per pattern matched, capped at 25.

### Formatting Checks (0–20 points)

```typescript
const formattingChecks = [
  { check: !hasTableMarkup,         points: 4, warning: 'Avoid tables/columns — ATS cannot parse them' },
  { check: wordCount >= 300,        points: 4, warning: 'Resume too short — aim for 400–800 words' },
  { check: wordCount <= 1000,       points: 4, warning: 'Resume too long — consider trimming to 2 pages' },
  { check: hasDates,                points: 4, warning: 'Include date ranges for each position' },
  { check: achievementCount >= 2,   points: 4, warning: 'Add quantified achievements (numbers, percentages)' },
];
```

### Readability Score (0–15 points)

Based on average sentence length:
- < 20 words avg → 15 pts
- 20–25 words avg → 10 pts
- 25–30 words avg → 5 pts
- > 30 words avg → 0 pts

Deductions for passive voice patterns.

### Section Detection

```typescript
type SectionDetected = {
  summary: boolean;
  experience: boolean;
  education: boolean;
  skills: boolean;
  projects: boolean;
};
```

Regex patterns detect common section headers (case-insensitive):
- Summary: `/\b(summary|objective|profile|about)\b/i`
- Experience: `/\b(experience|employment|work history|career)\b/i`
- Education: `/\b(education|degree|university|college)\b/i`
- Skills: `/\b(skills|technologies|tech stack|competencies)\b/i`
- Projects: `/\b(projects|portfolio|open source)\b/i`

---

## 9. AI Integration — Gemini

File: `src/services/ai/gemini.service.ts`

### Models Used

| Function | Model | Reason |
|---|---|---|
| `geminiAnalyze` | gemini-1.5-flash | Fast, cheap for structured JSON analysis |
| `geminiKeywordGap` | gemini-1.5-flash | JSON mode keyword extraction |
| `geminiRewrite` | gemini-1.5-pro | High-quality rewriting |
| `startResumeChat` | gemini-1.5-flash | Conversational, streaming |

### Retry Logic

```typescript
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)); // 2s, 4s, 8s
    }
  }
  throw new Error('unreachable');
}
```

### Keyword Gap Analysis

Returns structured JSON with:

```typescript
type KeywordGapResult = {
  criticalMissing: string[];      // High-priority missing keywords
  nicetohaveMissing: string[];    // Optional but helpful keywords
  presentKeywords: string[];      // Detected matching keywords
  recommendedAdditions: string[]; // Suggested phrases to add
  overallFit: number;             // 0–100 job fit score
  summary: string;                // Plain-text summary
};
```

Prompt uses `responseMimeType: 'application/json'` for guaranteed JSON output.

### Resume Rewriting

```typescript
export async function geminiRewrite(resumeText: string, jobDescription: string): Promise<string> {
  return withRetry(async () => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const prompt = rewritePrompt(resumeText, jobDescription);
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
}
```

### Chat Streaming

```typescript
export async function startResumeChat(
  resumeText: string,
  score: number,
  domain: string,
  missingKeywords: string[]
) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  return model.startChat({
    history: [{
      role: 'user',
      parts: [{ text: systemPrompt(resumeText, score, domain, missingKeywords) }],
    }, {
      role: 'model',
      parts: [{ text: 'I\'ve reviewed your resume. Ask me anything!' }],
    }],
  });
}

// Controller streams chunks via SSE:
const stream = await chat.sendMessageStream(message);
const streamResult = await stream.stream;
for await (const chunk of streamResult) {
  res.write(`data: ${JSON.stringify({ text: chunk.text() })}\n\n`);
}
```

---

## 10. Async Queue Architecture — BullMQ + Redis

### Why Async?

Processing a resume involves: PDF parsing + DB write + AI call (2–10s) + email send. Doing this synchronously would timeout on mobile networks and block the server. BullMQ moves all work off the request-response cycle.

### Queue Service — `src/services/queue/queue.service.ts`

```typescript
import { Queue } from 'bullmq';
import { redis } from '../../config/redis';

export const analysisQueue = new Queue<AnalysisJobPayload>('resume-analysis', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },  // 2s, 4s, 8s
    removeOnComplete: 100,   // Keep last 100 completed jobs
    removeOnFail: 500,       // Keep last 500 failed jobs for debugging
  },
});

export async function enqueueAnalysis(payload: AnalysisJobPayload): Promise<string> {
  const job = await analysisQueue.add('analyze', payload);
  return job.id!;
}
```

### Worker — `src/services/queue/workers/analysis.worker.ts`

```typescript
export const analysisWorker = new Worker<AnalysisJobPayload>(
  'resume-analysis',
  async (job) => {
    const { resumeBuffer, mode, domain, jobDescription,
            userId, name, email, originalName, mimeType, sizeBytes } = job.data;

    // Step 1: Parse resume text
    await progress(job, 'parsing', 10, 'Extracting text from resume…');
    const buffer = Buffer.from(resumeBuffer as string, 'base64'); // base64 decode
    const text = await extractText(buffer, mimeType);

    // Step 2: Save resume record
    await progress(job, 'saving', 20, 'Saving resume to database…');
    const resume = await prisma.resume.create({ data: { ... } });

    if (mode === 'rewrite') {
      // Step 3a: AI rewrite
      await progress(job, 'rewriting', 30, 'Gemini AI is rewriting your resume…');
      const rewrittenText = await geminiRewrite(text, jobDescription!);

      // Step 4a: Keyword gap
      await progress(job, 'gap-analysis', 65, 'Analysing keyword gaps…');
      const keywordGap = await geminiKeywordGap(text, jobDescription!).catch(() => null);

      // Save + email + notify ...
      return { success: true, mode: 'rewrite', analysisId, rewrittenText, keywordGap };
    }

    // Analyze mode:
    // Step 3b: ATS scoring
    await progress(job, 'analyzing', 40, `Analysing against ${domain} ATS criteria…`);
    const result = analyzeResume(text, domain);

    // Step 4b: Keyword gap (if JD provided)
    if (jobDescription) {
      await progress(job, 'gap-analysis', 65, 'Running AI keyword gap analysis…');
      const keywordGap = await geminiKeywordGap(text, jobDescription).catch(() => null);
    }

    // Step 5: Save analysis
    await progress(job, 'saving', 80, 'Saving analysis…');

    // Step 6: Send email
    await progress(job, 'email', 90, 'Sending your report by email…');

    // Step 7: Done
    await progress(job, 'done', 100, 'Complete!');
    return { success: true, mode: 'analyze', analysisId, ...result };
  },
  { connection: redis, concurrency: 5 }  // Process 5 jobs simultaneously
);
```

### Buffer Serialization

File buffers cannot be stored in Redis as raw bytes. The controller base64-encodes before enqueue, and the worker decodes:

```typescript
// Controller (before enqueue):
resumeBuffer: file.buffer.toString('base64')

// Worker (after dequeue):
const buffer = Buffer.from(resumeBuffer as string, 'base64');
```

### Job Progress Steps

| Step | Percent | Description |
|---|---|---|
| parsing | 10% | Text extraction from PDF/DOCX |
| saving | 20% | Resume record created in DB |
| analyzing / rewriting | 30–40% | ATS score OR Gemini rewrite |
| gap-analysis | 65% | Keyword gap (if JD provided) |
| saving | 80% | Analysis record created in DB |
| email | 90% | SMTP delivery sent |
| done | 100% | Job complete |

---

## 11. SSE Real-Time Streaming

File: `src/controllers/resume.controller.ts` — `streamJobProgress`

SSE lets the browser receive live updates without WebSockets. The controller bridges BullMQ job events to the HTTP response stream.

### Flow

```
Browser                    Backend                    BullMQ
  │                           │                          │
  ├── GET /jobs/:id/stream ──>│                          │
  │                           ├── check if completed ──>│
  │                           │<── state=active ─────────┤
  │                           ├── create QueueEvents     │
  │                           ├── listen for events ────>│
  │<── event: progress ───────┤<── progress event ───────┤
  │<── event: progress ───────┤<── progress event ───────┤
  │<── event: completed ──────┤<── completed event ───────┤
  │                           ├── cleanup + res.end()    │
```

### Implementation

```typescript
export const streamJobProgress: RequestHandler = async (req, res) => {
  const { jobId } = req.params as { jobId: string };

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');  // Disable Nginx buffering
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Handle already-completed jobs
  const job = await analysisQueue.getJob(jobId);
  if (job) {
    const state = await job.getState();
    if (state === 'completed') { send('completed', job.returnvalue); res.end(); return; }
    if (state === 'failed') { send('error', { message: job.failedReason }); res.end(); return; }
  }

  // Bridge BullMQ events → SSE
  const queueEvents = new QueueEvents('resume-analysis', { connection: redis });
  
  const cleanup = () => {
    queueEvents.off('progress', onProgress as any);
    queueEvents.off('completed', onCompleted as any);
    queueEvents.off('failed', onFailed as any);
    queueEvents.close();
    res.end();
  };

  queueEvents.on('progress', ({ jobId: jid, data }) => {
    if (jid === jobId) send('progress', data);
  });
  queueEvents.on('completed', ({ jobId: jid, returnvalue }) => {
    if (jid === jobId) { send('completed', returnvalue); cleanup(); }
  });
  queueEvents.on('failed', ({ jobId: jid, failedReason }) => {
    if (jid === jobId) { send('error', { message: failedReason }); cleanup(); }
  });

  req.on('close', cleanup);

  // Heartbeat every 25s — prevents Nginx/load balancer from closing idle connections
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);
  req.on('close', () => clearInterval(heartbeat));
};
```

### Frontend Consumption

```typescript
const source = new EventSource(`${API_URL}/api/v1/resumes/jobs/${jobId}/stream`);

source.addEventListener('progress', (e) => {
  const data = JSON.parse(e.data);  // { step, percent, message }
  updateProgressBar(data.percent, data.message);
});

source.addEventListener('completed', (e) => {
  const result = JSON.parse(e.data);  // Full analysis result
  showResults(result);
  source.close();
});

source.addEventListener('error', (e) => {
  const { message } = JSON.parse(e.data);
  showError(message);
  source.close();
});
```

---

## 12. API Reference

Base URL: `http://localhost:5000/api/v1`

### Resume Endpoints

#### `POST /resumes` — Upload & Enqueue

```
Accepts: multipart/form-data
Auth: Optional (optionalAuth middleware)
Rate Limit: 15 uploads/hour

Form Fields:
  resume        File    PDF or DOCX, max 5MB
  name          String  Required
  email         String  Required
  domain        String  Required — one of 12 domains
  mode          String  "analyze" (default) | "rewrite"
  jobDescription String  Required for mode=rewrite

Response 202:
{
  "success": true,
  "jobId": "abc123",
  "message": "Analysis queued — connect to the SSE stream for real-time progress"
}
```

#### `GET /resumes/jobs/:jobId/status` — Poll Job Status

```
Response 200:
{
  "success": true,
  "jobId": "abc123",
  "state": "active" | "completed" | "failed" | "waiting",
  "progress": { "step": "analyzing", "percent": 40, "message": "..." },
  "result": null | { ...fullResult },
  "failedReason": null | "error message"
}
```

#### `GET /resumes/jobs/:jobId/stream` — SSE Progress Stream

```
Response: text/event-stream

Events:
  event: progress
  data: { "step": "parsing", "percent": 10, "message": "..." }

  event: completed
  data: { "success": true, "mode": "analyze", "score": 73, "analysisId": "...", ... }

  event: error
  data: { "message": "Job failed: ..." }

  : heartbeat   (every 25s, no event name)
```

### Analysis Endpoints

#### `GET /analyses/:id` — Get Single Analysis

```
Auth: None
Response 200:
{
  "success": true,
  "data": {
    "id": "...", "mode": "analyze", "domain": "software-engineer",
    "score": 73, "keywordsMatched": [...], "keywordsMissed": [...],
    "suggestions": [...], "warnings": [...],
    "breakdown": { "keywords": 28, "achievements": 15, "formatting": 18, "readability": 12 },
    "keywordGap": { "criticalMissing": [...], ... },
    "resume": { "id": "...", "originalName": "resume.pdf", "extractedText": "..." }
  }
}
```

#### `GET /analyses/history` — User's Analysis History

```
Auth: Required (JWT)
Response 200:
{ "success": true, "data": [ ...analyses ] }
```

#### `GET /analyses/analytics` — User Analytics

```
Auth: Required (JWT)
Response 200:
{
  "success": true,
  "data": {
    "totalAnalyses": 12,
    "avgScore": 67,
    "scoreImprovement": 15,    // Latest minus earliest
    "bestScore": 84,
    "topMissingKeywords": [    // Most frequently missing
      { "keyword": "docker", "count": 8 },
      ...
    ],
    "scoreOverTime": [         // For chart
      { "date": "2026-01-15", "score": 52 },
      { "date": "2026-02-20", "score": 67 },
      ...
    ]
  }
}
```

#### `GET /analyses/compare?ids=id1,id2,id3` — Compare Analyses

```
Auth: None
Query: ids — comma-separated, 2–5 analysis IDs
Response 200: { "success": true, "data": [ ...analyses ] }
```

#### `GET /analyses/:id/keyword-gap` — On-Demand Keyword Gap

```
Auth: None (analysis must have jobDescription)
Response 200: { "success": true, "data": { ...KeywordGapResult } }
```

#### `POST /analyses/:id/chat` — AI Chat (SSE Streaming)

```
Auth: None
Body: { "message": "How can I improve my skills section?" }
Response: text/event-stream

Events:
  data: { "text": "You should add..." }
  event: done
  data: {}
```

### User Endpoints

#### `POST /users/register` — Create Account

```
Body: { "name": "Jane Doe", "email": "jane@example.com", "password": "secure123" }
Response 201:
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { "id": "...", "email": "jane@example.com", "name": "Jane Doe" }
}
```

#### `POST /users/login` — Get Token

```
Body: { "email": "jane@example.com", "password": "secure123" }
Response 200: { "success": true, "token": "...", "user": { ... } }
Errors: 401 if invalid credentials
```

#### `GET /users/me` — Current User

```
Auth: Required
Response 200: { "success": true, "data": { "id", "email", "name", "createdAt" } }
```

### System Endpoints

#### `GET /health`

```
Response 200:
{
  "status": "ok",
  "timestamp": "2026-05-13T10:00:00.000Z",
  "uptime": 3600
}
```

---

## 13. Middleware Stack

Request processing order in `src/server.ts`:

```
Request
  │
  ├── helmet()                    # Security headers (11 headers)
  ├── compression()               # gzip responses
  ├── cors({ origin: FRONTEND_URL })  # Restrict to frontend only
  ├── requestLogger               # Assign X-Request-Id, log timing
  ├── express.json({ limit: '1mb' })
  ├── apiLimiter (100 req/15min)  # Global rate limit
  │
  ├── /health                     # No auth, no limit
  ├── /api/v1/...
  │     ├── resume routes
  │     │     └── uploadLimiter (15 uploads/hour)
  │     ├── analysis routes
  │     └── user routes
  │
  ├── 404 handler
  └── errorHandler                # Converts errors to JSON responses
```

### Rate Limiting

```typescript
// Global: 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload: 15 uploads per hour per IP
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
});
```

### Request Logger

```typescript
export const requestLogger: RequestHandler = (req, _res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
};
```

---

## 14. Email & Notifications

### Email — `src/services/email.service.ts`

Uses Nodemailer with Gmail SMTP (TLS port 587).

**Analysis Email** includes:
- Overall ATS score with color coding (green ≥70, yellow ≥50, red <50)
- Score breakdown table (keywords/achievements/formatting/readability)
- Missing keywords list
- Suggestions list
- Warnings list

**Rewrite Email** includes:
- Cover paragraph
- Full rewritten resume as formatted HTML pre block

### Telegram Notifications — `src/services/notification.service.ts`

Sends a message to the admin chat whenever a resume is processed:

```typescript
export async function sendResumeToAdmin(
  fileName: string,
  meta: { name: string; email: string; domain: string; score: string }
): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) return;

  const text = [
    '📄 *New Resume Processed*',
    `Name: ${meta.name}`,
    `Email: ${meta.email}`,
    `Domain: ${meta.domain}`,
    `Score: ${meta.score}`,
    `File: ${fileName}`,
  ].join('\n');

  await axios.post(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    { chat_id: env.TELEGRAM_ADMIN_CHAT_ID, text, parse_mode: 'Markdown' }
  ).catch(err => logger.warn({ message: 'Telegram notification failed', error: err.message }));
}
```

---

## 15. Error Handling

### Custom Error Classes — `src/lib/errors.ts`

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) { super(message); }
}

export class ValidationError extends AppError {
  constructor(message: string) { super(message, 400, 'VALIDATION_ERROR'); }
}

export class NotFoundError extends AppError {
  constructor(resource: string) { super(`${resource} not found`, 404, 'NOT_FOUND'); }
}

export class UnauthorizedError extends AppError {
  constructor() { super('Authentication required', 401, 'UNAUTHORIZED'); }
}
```

### Error Handler Middleware

```typescript
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
      requestId: req.id,
    });
    return;
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: `File exceeds ${env.MAX_FILE_SIZE_MB}MB limit` },
    });
    return;
  }

  logger.error({ message: err.message, stack: err.stack, requestId: req.id });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
};
```

---

## 16. Logging

File: `src/lib/logger.ts`

```typescript
import winston from 'winston';
import { env } from '../config/env';

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp, ...meta }) =>
    `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
  )
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

Log files are written to `backend/logs/` (auto-created, gitignored).

---

## 17. Docker & Infrastructure

### `docker-compose.yml` (project root)

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ats
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: smackcoders
    ports: ['5433:5432']
    volumes: ['postgres_data:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s

  backend:
    build: ./backend
    ports: ['5000:5000']
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    environment:
      DATABASE_URL: postgresql://postgres:smackcoders@postgres:5432/ats
      REDIS_URL: redis://redis:6379

  frontend:
    build: ./frontend
    ports: ['3000:3000']
    depends_on: [backend]
    environment:
      NEXT_PUBLIC_API_URL: http://backend:5000

volumes:
  postgres_data:
```

### `backend/Dockerfile`

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
COPY prisma.config.ts .
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

---

## 18. CI/CD — GitHub Actions

File: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: ats_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: 'backend/package-lock.json' }
      - run: npm ci
        working-directory: backend
      - run: npm run typecheck
        working-directory: backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ats_test
      - run: npx prisma db push
        working-directory: backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ats_test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: 'frontend/package-lock.json' }
      - run: npm ci
        working-directory: frontend
      - run: npx tsc --noEmit
        working-directory: frontend
      - run: npm run build
        working-directory: frontend
        env:
          NEXT_PUBLIC_API_URL: http://localhost:5000
```

---

## 19. How to Run

### Development (local)

**Prerequisites:** Node.js 20+, PostgreSQL 16, Redis 7

```bash
# 1. Start infrastructure
docker compose up postgres redis -d

# 2. Backend setup
cd backend
cp .env.example .env
# Edit .env with your actual values

npm install --legacy-peer-deps
npm run db:generate          # Generate Prisma client
npm run db:push              # Sync schema to database
npm run dev                  # tsx watch src/server.ts → hot reload

# 3. Frontend setup (new terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                  # Next.js dev server
```

### Production (Docker)

```bash
# Build and start all services
docker compose up --build -d

# Check logs
docker compose logs -f backend

# Run DB migration in container
docker compose exec backend npx prisma db push
```

### Useful Commands

```bash
# Backend
npm run dev          # Development with hot reload
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled JS
npm run typecheck    # TypeScript check without output
npm run db:generate  # Regenerate Prisma client after schema change
npm run db:push      # Push schema changes to DB (no migration file)
npm run db:migrate   # Create and apply migration files
npm run db:studio    # Open Prisma Studio GUI

# Docker
docker compose up -d                    # Start all services
docker compose down                     # Stop all services
docker compose down -v                  # Stop + remove volumes
docker compose logs -f backend          # Follow backend logs
docker compose exec backend sh          # Shell into backend container
```

---

## 20. Key Decisions & Gotchas

### Prisma v7: No URL in schema.prisma

Prisma v7 deprecated the `url` field in the datasource block. If you see:
```
Error: The datasource property 'url' is no longer supported in schema files
```
The fix: Use `prisma.config.ts` at the project root with `defineConfig()`. Do NOT put the URL back in `schema.prisma`.

### Prisma v7: Use pg adapter

Prisma v7 requires an explicit database adapter. The `@prisma/adapter-pg` package wraps a `pg` Pool:

```typescript
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
const pool = new Pool({ connectionString: env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
```

### npm with Express v5: Use --legacy-peer-deps

Some packages (like `express-async-errors`) declare `express@^4` as a peer dependency. Since the project uses Express v5, all installs require:
```bash
npm install <package> --legacy-peer-deps
```

### TypeScript: Prisma Json fields require `as any`

When saving complex objects to `Json?` fields in Prisma, TypeScript's strict mode rejects the types. Cast to `as any`:
```typescript
breakdown: result.breakdown as any,
keywordGap: keywordGap as any,
```

### BullMQ: Redis must have maxRetriesPerRequest: null

BullMQ requires ioredis to not throw on retry exhaustion:
```typescript
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,  // Required by BullMQ
});
```

### SSE: X-Accel-Buffering header

When behind Nginx, SSE connections get buffered and clients don't receive events in real time. Set:
```
X-Accel-Buffering: no
```

### TypeScript: moduleResolution deprecation in TS 6+

The `"moduleResolution": "node"` (node10) setting triggers a deprecation warning treated as error in TypeScript 6. Fix:
```json
{ "ignoreDeprecations": "6.0" }
```

### Gemini streaming: use stream.stream not stream directly

The `sendMessageStream()` return type is `GenerateContentStreamResult`, not an async iterable directly:

```typescript
// Wrong:
for await (const chunk of stream) { ... }

// Correct:
const streamResult = await stream.stream;
for await (const chunk of streamResult) { ... }
```

### Express v5: req.params types

In strict TypeScript, `req.params.id` is `string | string[]`. Cast it:
```typescript
// Option 1: inline cast
const id = req.params.id as string;

// Option 2: destructure cast
const { jobId } = req.params as { jobId: string };
```
