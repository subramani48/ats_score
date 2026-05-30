Let me read the full codebase before analyzing anything.
                                                                            
  Searched for 2 patterns, read 6 files (ctrl+o to expand)     
                                                                                                                                                                                                            
⏺ I have a complete picture of the entire stack. Let me write the full audit and roadmap now.                                                                                                               
                                                                                                                                                                                                            
  ---                                                                                                                                                                                                     
  ATS Resume Analyzer — Senior Engineer Audit & 2026 SaaS Upgrade Roadmap                                                                                                                                   
                                                                                                                                                                                                            
  Section 1: Current Architecture Audit                                                                                                                                                                     
                                                                                                                                                                                                            
  What you have (honestly assessed)                                                                                                                                                                         
                                                                                                                                                                                                            
  BACKEND                                                                                                                                                                                                   
  ├── server.js              ← monolithic entry, no middleware stack                                                                                                                                        
  ├── controllers/                                                                                                                                                                                          
  │   └── uploadController.js ← does parsing + analysis + email + telegram in one fn
  ├── services/                                                                                                                                                                                             
  │   ├── analyzerService.js  ← keyword match only, no ML, no semantic scoring
  │   ├── aiService.js        ← single Gemini call, no retry, no streaming                                                                                                                                  
  │   ├── emailService.js     ← no queue, sends synchronously blocking the response
  │   └── telegramService.js  ← fire-and-forget, no error recovery                                                                                                                                          
  └── config/                                                                                                                                                                                               
      └── keywords.json       ← 8 domains, ~10 keywords each — far too sparse                                                                                                                               
                                                                                                                                                                                                            
  FRONTEND                                                  
  └── src/                                                                                                                                                                                                  
      ├── app/page.tsx         ← landing + all sections in one file
      └── components/                                                                                                                                                                                       
          └── UploadSection.tsx ← entire wizard, all state, all API calls in one 700-line component
                                                                                                                                                                                                            
  INFRASTRUCTURE                                            
  └── Nothing — no DB, no cache, no queue, no auth, no Docker, no CI/CD                                                                                                                                     
                                                                                                                                                                                                            
  Critical gaps vs a real 2026 SaaS product                                                                                                                                                                 
                                                                                                                                                                                                            
  ┌────────────────────────────────────────────┬──────────┬────────────────────────────────┐                                                                                                                
  │                    Gap                     │ Severity │ Impact on Recruiter Impression │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No database — nothing persists             │ Critical │ Disqualifying                  │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No authentication                          │ Critical │ Disqualifying                  │                                                                                                                
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤
  │ Email sent synchronously — blocks response │ Critical │ Poor architecture signal       │                                                                                                                
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ CORS: app.use(cors()) — fully open         │ Critical │ Security red flag              │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No rate limiting — trivially abused        │ High     │ Production gap                 │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ keywords.json is the "AI engine"           │ High     │ Not impressive                 │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ Hardcoded localhost:5000 in frontend       │ High     │ Amateur signal                 │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No API versioning                          │ High     │ Architecture gap               │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No logging or observability                │ High     │ Not production-ready           │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No error handling middleware               │ High     │ Code quality signal            │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ Backend is plain JS (no TypeScript)        │ Medium   │ Quality signal                 │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No tests whatsoever                        │ Medium   │ Professional gap               │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No Docker                                  │ Medium   │ DevOps gap                     │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No CI/CD                                   │ Medium   │ DevOps gap                     │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤
  │ Single component 700+ lines                │ Medium   │ Frontend architecture          │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No env validation (typos crash silently)   │ Medium   │ Reliability gap                │
  └────────────────────────────────────────────┴──────────┴────────────────────────────────┘                                                                                                                
                                                            
  ---                                                                                                                                                                                                       
  Section 2: Proposed Production Architecture               

  ats-analyzer/
  ├── backend/                          ← Node.js + TypeScript + Express
  │   ├── src/                                                                                                                                                                                              
  │   │   ├── api/
  │   │   │   └── v1/                                                                                                                                                                                       
  │   │   │       ├── routes/                               
  │   │   │       │   ├── auth.routes.ts                                                                                                                                                                    
  │   │   │       │   ├── resume.routes.ts                  
  │   │   │       │   ├── analysis.routes.ts                                                                                                                                                                
  │   │   │       │   └── user.routes.ts
  │   │   │       └── index.ts                                                                                                                                                                              
  │   │   ├── controllers/                                  
  │   │   │   ├── auth.controller.ts                                                                                                                                                                        
  │   │   │   ├── resume.controller.ts                      
  │   │   │   └── analysis.controller.ts                                                                                                                                                                    
  │   │   ├── services/
  │   │   │   ├── resume/                                                                                                                                                                                   
  │   │   │   │   ├── parser.service.ts     ← PDF/DOCX extraction                                                                                                                                           
  │   │   │   │   ├── analyzer.service.ts   ← ATS scoring engine
  │   │   │   │   └── rewriter.service.ts   ← Gemini AI rewrite                                                                                                                                             
  │   │   │   ├── ai/                                                                                                                                                                                       
  │   │   │   │   ├── gemini.service.ts     ← Gemini client + retry logic                                                                                                                                   
  │   │   │   │   └── prompts/              ← prompt templates as files                                                                                                                                     
  │   │   │   ├── queue/                                                                                                                                                                                    
  │   │   │   │   ├── queue.service.ts      ← BullMQ setup                                                                                                                                                  
  │   │   │   │   └── workers/                                                                                                                                                                              
  │   │   │   │       ├── email.worker.ts                                                                                                                                                                   
  │   │   │   │       └── analysis.worker.ts
  │   │   │   ├── email.service.ts                                                                                                                                                                          
  │   │   │   └── notification.service.ts   ← Telegram + future channels                                                                                                                                    
  │   │   ├── repositories/                                                                                                                                                                                 
  │   │   │   ├── user.repository.ts                                                                                                                                                                        
  │   │   │   ├── resume.repository.ts                                                                                                                                                                      
  │   │   │   └── analysis.repository.ts                                                                                                                                                                    
  │   │   ├── middleware/
  │   │   │   ├── auth.middleware.ts                                                                                                                                                                        
  │   │   │   ├── rateLimit.middleware.ts                   
  │   │   │   ├── validate.middleware.ts    ← Zod schema validation                                                                                                                                         
  │   │   │   ├── errorHandler.middleware.ts
  │   │   │   └── requestLogger.middleware.ts                                                                                                                                                               
  │   │   ├── config/                                       
  │   │   │   ├── env.ts                   ← Zod-validated env                                                                                                                                              
  │   │   │   ├── database.ts              ← Prisma client                                                                                                                                                  
  │   │   │   ├── redis.ts                 ← ioredis client
  │   │   │   └── keywords/                                                                                                                                                                                 
  │   │   │       └── *.json               ← per-domain keyword files
  │   │   ├── lib/                                                                                                                                                                                          
  │   │   │   ├── logger.ts                ← Winston structured logger
  │   │   │   └── errors.ts                ← custom error classes                                                                                                                                           
  │   │   ├── types/                                                                                                                                                                                        
  │   │   │   └── index.ts                                                                                                                                                                                  
  │   │   └── server.ts                                                                                                                                                                                     
  │   ├── prisma/                                           
  │   │   ├── schema.prisma
  │   │   └── migrations/                                                                                                                                                                                   
  │   ├── tests/
  │   │   ├── unit/                                                                                                                                                                                         
  │   │   └── integration/                                  
  │   ├── Dockerfile
  │   ├── .env.example                                                                                                                                                                                      
  │   └── tsconfig.json
  │                                                                                                                                                                                                         
  ├── frontend/                          ← Next.js 15 + TypeScript
  │   ├── src/                                                                                                                                                                                              
  │   │   ├── app/
  │   │   │   ├── (marketing)/            ← route group                                                                                                                                                     
  │   │   │   │   └── page.tsx            ← landing page                                                                                                                                                    
  │   │   │   ├── (auth)/
  │   │   │   │   ├── login/page.tsx                                                                                                                                                                        
  │   │   │   │   └── register/page.tsx                     
  │   │   │   ├── dashboard/                                                                                                                                                                                
  │   │   │   │   ├── page.tsx            ← user dashboard                                                                                                                                                  
  │   │   │   │   ├── history/page.tsx    ← analysis history
  │   │   │   │   └── resume/[id]/page.tsx                                                                                                                                                                  
  │   │   │   └── api/                                      
  │   │   │       └── auth/[...nextauth]/  ← Auth.js                                                                                                                                                        
  │   │   ├── components/                                                                                                                                                                                   
  │   │   │   ├── upload/
  │   │   │   │   ├── UploadWizard.tsx                                                                                                                                                                      
  │   │   │   │   ├── DomainStep.tsx                        
  │   │   │   │   ├── DetailsStep.tsx                                                                                                                                                                       
  │   │   │   │   └── FileStep.tsx                          
  │   │   │   ├── results/                                                                                                                                                                                  
  │   │   │   │   ├── ScoreDashboard.tsx                    
  │   │   │   │   ├── RadialGauge.tsx                                                                                                                                                                       
  │   │   │   │   ├── KeywordGapAnalysis.tsx                                                                                                                                                                
  │   │   │   │   └── SuggestionCard.tsx
  │   │   │   ├── dashboard/                                                                                                                                                                                
  │   │   │   │   ├── AnalysisHistory.tsx                   
  │   │   │   │   ├── ScoreTrendChart.tsx                                                                                                                                                                   
  │   │   │   │   └── ResumeVersionCard.tsx                 
  │   │   │   └── ui/                     ← shadcn/ui components                                                                                                                                            
  │   │   ├── hooks/                                        
  │   │   │   ├── useAnalysis.ts                                                                                                                                                                            
  │   │   │   ├── useResumeHistory.ts                       
  │   │   │   └── useRealtimeProgress.ts  ← SSE hook                                                                                                                                                        
  │   │   ├── lib/                                                                                                                                                                                          
  │   │   │   ├── api.ts                  ← typed API client
  │   │   │   └── auth.ts                                                                                                                                                                                   
  │   │   └── stores/                                                                                                                                                                                       
  │   │       └── analysisStore.ts        ← Zustand
  │   └── ...                                                                                                                                                                                               
  │                                                         
  ├── docker-compose.yml                 ← postgres + redis + backend + frontend                                                                                                                            
  ├── .github/                                                                                                                                                                                              
  │   └── workflows/
  │       ├── ci.yml                                                                                                                                                                                        
  │       └── deploy.yml                                    
  └── README.md
                                                                                                                                                                                                            
  ---
  Section 3: Features by Priority                                                                                                                                                                           
                                                            
  ---
  🔴 HIGH IMPACT — Phase 1 (Weeks 1–2)

  ---
  1. PostgreSQL + Prisma ORM

  Why it matters for recruiters: A stateless app that throws away every analysis is a toy, not a product. Persistence enables user history, analytics, A/B testing, and everything meaningful.

  Tech: prisma, @prisma/client, PostgreSQL 16

  Schema:

  // prisma/schema.prisma

  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }                                                                                                                                                                                                         
   
  model User {                                                                                                                                                                                              
    id           String     @id @default(cuid())            
    email        String     @unique
    name         String?
    passwordHash String?
    provider     String     @default("email")  // email | google | github                                                                                                                                   
    createdAt    DateTime   @default(now())
    updatedAt    DateTime   @updatedAt                                                                                                                                                                      
    analyses     Analysis[]                                                                                                                                                                                 
    resumes      Resume[]
  }                                                                                                                                                                                                         
                                                            
  model Resume {
    id           String     @id @default(cuid())
    userId       String?                                                                                                                                                                                    
    originalName String
    mimeType     String                                                                                                                                                                                     
    sizeBytes    Int                                        
    storagePath  String?    // S3/R2 key if using object storage
    extractedText String?   @db.Text                                                                                                                                                                        
    createdAt    DateTime   @default(now())                                                                                                                                                                 
    analyses     Analysis[]                                                                                                                                                                                 
    user         User?      @relation(fields: [userId], references: [id])                                                                                                                                   
  }                                                         

  model Analysis {                                                                                                                                                                                          
    id             String   @id @default(cuid())
    userId         String?                                                                                                                                                                                  
    resumeId       String                                   
    mode           String   // analyze | rewrite
    domain         String
    score          Int?                                                                                                                                                                                     
    keywordsMatched String[] // PostgreSQL array
    keywordsMissed String[]                                                                                                                                                                                 
    suggestions    String[]                                                                                                                                                                                 
    rewrittenText  String?  @db.Text
    jobDescription String?  @db.Text                                                                                                                                                                        
    emailSent      Boolean  @default(false)                 
    processingMs   Int?     // track performance                                                                                                                                                            
    createdAt      DateTime @default(now())                                                                                                                                                                 
    user           User?    @relation(fields: [userId], references: [id])
    resume         Resume   @relation(fields: [resumeId], references: [id])                                                                                                                                 
                                                                                                                                                                                                            
    @@index([userId])
    @@index([domain])                                                                                                                                                                                       
    @@index([createdAt])                                    
  }

  Recruiter impact: Shows you understand data modeling, indexing strategy, and relational design — not just CRUD tutorials.                                                                                 
   
  ---                                                                                                                                                                                                       
  2. BullMQ + Redis Job Queue                               
                                                                                                                                                                                                            
  Why it matters: Right now handleUpload blocks the HTTP response for up to 30 seconds while Gemini processes. This is production-fatal — one slow request blocks the Node.js event loop path, and users get
   timeout errors. A job queue decouples processing from response.                                                                                                                                          
                                                            
  Tech: bullmq, ioredis                                                                                                                                                                                     
                                                            
  Architecture:                                                                                                                                                                                             
                                                            
  // src/services/queue/queue.service.ts
  import { Queue, Worker, QueueEvents } from 'bullmq';
  import { redis } from '../../config/redis';                                                                                                                                                               
   
  export const analysisQueue = new Queue('resume-analysis', {                                                                                                                                               
    connection: redis,                                      
    defaultJobOptions: {                                                                                                                                                                                    
      attempts: 3,                                          
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,                                                                                                                                                                                    
    },
  });                                                                                                                                                                                                       
                                                            
  // Controller: immediately returns a jobId                                                                                                                                                                
  export const enqueueAnalysis = async (payload: AnalysisJobPayload) => {
    const job = await analysisQueue.add('analyze', payload, {                                                                                                                                               
      priority: payload.mode === 'rewrite' ? 1 : 2,                                                                                                                                                         
    });                                                                                                                                                                                                     
    return job.id;                                                                                                                                                                                          
  };                                                                                                                                                                                                        
                                                            
  // src/services/queue/workers/analysis.worker.ts
  const worker = new Worker('resume-analysis', async (job) => {
    const { resumeBuffer, mode, domain, jobDescription, userId } = job.data;                                                                                                                                
                                                                                                                                                                                                            
    await job.updateProgress(10);                                                                                                                                                                           
    const text = await parserService.extract(resumeBuffer);                                                                                                                                                 
                                                                                                                                                                                                            
    await job.updateProgress(30);
    const result = mode === 'rewrite'                                                                                                                                                                       
      ? await rewriterService.rewrite(text, jobDescription)                                                                                                                                                 
      : await analyzerService.analyze(text, domain);
                                                                                                                                                                                                            
    await job.updateProgress(80);                                                                                                                                                                           
    await emailService.send(result);
                                                                                                                                                                                                            
    await job.updateProgress(100);                          
    return result;
  }, { connection: redis, concurrency: 5 });
                                                                                                                                                                                                            
  Frontend: Poll /api/v1/jobs/:jobId/status or use SSE (see feature 6) for real-time progress.                                                                                                              
                                                                                                                                                                                                            
  Recruiter impact: Demonstrates understanding of async processing, worker concurrency, retry logic, and backpressure — patterns used at every serious backend.                                             
                                                            
  ---                                                                                                                                                                                                       
  3. Zod Environment Validation                             
                                                                                                                                                                                                            
  Why it matters: Silent misconfiguration is a production killer. Your app currently starts fine with a missing GEMINI_API_KEY and crashes only when a user triggers the AI path.
                                                                                                                                                                                                            
  Tech: zod                                                 
                                                                                                                                                                                                            
  // src/config/env.ts                                      
  import { z } from 'zod';

  const envSchema = z.object({
    NODE_ENV:               z.enum(['development', 'production', 'test']),
    PORT:                   z.coerce.number().default(5000),                                                                                                                                                
    DATABASE_URL:           z.string().url(),
    REDIS_URL:              z.string().url(),                                                                                                                                                               
    GEMINI_API_KEY:         z.string().min(1),              
    SMTP_HOST:              z.string(),                                                                                                                                                                     
    SMTP_PORT:              z.coerce.number().default(587),                                                                                                                                                 
    SMTP_USER:              z.string().email(),
    SMTP_PASS:              z.string().min(1),                                                                                                                                                              
    JWT_SECRET:             z.string().min(32),                                                                                                                                                             
    TELEGRAM_BOT_TOKEN:     z.string().optional(),
    TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),                                                                                                                                                          
    FRONTEND_URL:           z.string().url().default('http://localhost:3000'),                                                                                                                              
    MAX_FILE_SIZE_MB:       z.coerce.number().default(5),
  });                                                                                                                                                                                                       
                                                            
  export const env = envSchema.parse(process.env); // throws on startup if invalid                                                                                                                          
                                                            
  Recruiter impact: Shows you write defensive, fail-fast code — the kind senior engineers write.                                                                                                            
                                                            
  ---                                                                                                                                                                                                       
  4. Structured Error Handling + Winston Logging            
                                                
  Why it matters: console.error is not logging. Real apps need structured JSON logs, log levels, request correlation IDs, and log shipping to a service (Datadog, Logtail, etc.).
                                                                                                                                                                                                            
  Tech: winston, express-async-errors, uuid                                                                                                                                                                 
                                                                                                                                                                                                            
  // src/lib/logger.ts                                                                                                                                                                                      
  import winston from 'winston';                            

  export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(                                                                                                                                                                         
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),                                                                                                                                                               
      winston.format.json(),                                
    ),                                                                                                                                                                                                      
    transports: [
      new winston.transports.Console({                                                                                                                                                                      
        format: process.env.NODE_ENV === 'development'      
          ? winston.format.prettyPrint()
          : winston.format.json(),                                                                                                                                                                          
      }),
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),                                                                                                                          
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ],                                                                                                                                                                                                      
  });
                                                                                                                                                                                                            
  // src/lib/errors.ts                                      
  export class AppError extends Error {
    constructor(                                                                                                                                                                                            
      public message: string,
      public statusCode: number = 500,                                                                                                                                                                      
      public code: string = 'INTERNAL_ERROR',               
    ) {
      super(message);                                                                                                                                                                                       
      this.name = 'AppError';
    }                                                                                                                                                                                                       
  }                                                         

  export class ValidationError extends AppError {
    constructor(message: string) { super(message, 400, 'VALIDATION_ERROR'); }
  }                                                                                                                                                                                                         
   
  export class RateLimitError extends AppError {                                                                                                                                                            
    constructor() { super('Too many requests', 429, 'RATE_LIMIT_EXCEEDED'); }
  }

  // src/middleware/errorHandler.middleware.ts
  import { logger } from '../lib/logger';                                                                                                                                                                   
  import { AppError } from '../lib/errors';
                                                                                                                                                                                                            
  export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {                                                                                                                               
    const requestId = req.headers['x-request-id'] as string;
                                                                                                                                                                                                            
    logger.error({                                                                                                                                                                                          
      message: err.message,
      stack: err.stack,                                                                                                                                                                                     
      requestId,                                            
      path: req.path,
      method: req.method,
    });                                                                                                                                                                                                     
   
    if (err instanceof AppError) {                                                                                                                                                                          
      return res.status(err.statusCode).json({              
        success: false,
        error: { code: err.code, message: err.message },
        requestId,
      });                                                                                                                                                                                                   
    }
                                                                                                                                                                                                            
    res.status(500).json({                                  
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      requestId,                                                                                                                                                                                            
    });
  };                                                                                                                                                                                                        
                                                            
  ---
  5. Rate Limiting + Security Hardening
                                       
  Why it matters: Your API is fully open — anyone can hit /api/upload 10,000 times and rack up Gemini API bills, spam emails, or DoS the server.
                                                                                                                                                                                                            
  Tech: express-rate-limit, rate-limit-redis, helmet, express-mongo-sanitize                                                                                                                                
                                                                                                                                                                                                            
  // src/middleware/rateLimit.middleware.ts                                                                                                                                                                 
  import rateLimit from 'express-rate-limit';               
  import RedisStore from 'rate-limit-redis';                                                                                                                                                                
  import { redis } from '../config/redis';
                                                                                                                                                                                                            
  export const apiLimiter = rateLimit({                                                                                                                                                                     
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100,                                                                                                                                                                                               
    standardHeaders: true,                                  
    legacyHeaders: false,
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),                                                                                                                               
  });                                                                                                                                                                                                       
                                                                                                                                                                                                            
  export const uploadLimiter = rateLimit({                                                                                                                                                                  
    windowMs: 60 * 60 * 1000,   // 1 hour                   
    max: 10,                     // max 10 analyses per hour per IP
    message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Max 10 analyses per hour' } },                                                                                                               
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),                                                                                                                               
  });                                                                                                                                                                                                       
                                                                                                                                                                                                            
  // server.ts                                              
  app.use(helmet());              // sets 11 security headers                                                                                                                                               
  app.use(compression());         // gzip all responses     
  app.use(cors({                                                                                                                                                                                            
    origin: env.FRONTEND_URL,
    credentials: true,                                                                                                                                                                                      
    methods: ['GET', 'POST'],                               
  }));                                                                                                                                                                                                      
  app.use('/api/v1/resume', uploadLimiter);
  app.use('/api', apiLimiter);                                                                                                                                                                              
                                                            
  ---                                                                                                                                                                                                       
  6. Server-Sent Events for Real-Time Progress
                                                                                                                                                                                                            
  Why it matters: Users staring at a spinner for 20–30 seconds (Gemini rewrite) is terrible UX. SSE pushes live progress updates — "Extracting text… Analysing keywords… Rewriting with AI… Sending email…"
  — for near-zero cost (no WebSocket infrastructure).                                                                                                                                                       
   
  Backend:                                                                                                                                                                                                  
                                                            
  // src/api/v1/routes/analysis.routes.ts                                                                                                                                                                   
  router.get('/jobs/:jobId/stream', authMiddleware.optional, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');                                                                                                                                                     
    res.setHeader('Cache-Control', 'no-cache');                                                                                                                                                             
    res.setHeader('Connection', 'keep-alive');                                                                                                                                                              
    res.flushHeaders();                                                                                                                                                                                     
                                                            
    const queueEvents = new QueueEvents('resume-analysis', { connection: redis });                                                                                                                          
   
    const send = (event: string, data: object) => {                                                                                                                                                         
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };                                                                                                                                                                                                      
                                                            
    queueEvents.on('progress', ({ jobId, data }) => {                                                                                                                                                       
      if (jobId === req.params.jobId) send('progress', data);
    });                                                                                                                                                                                                     
                                                                                                                                                                                                            
    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      if (jobId === req.params.jobId) {                                                                                                                                                                     
        send('completed', returnvalue);                                                                                                                                                                     
        res.end();
      }                                                                                                                                                                                                     
    });                                                     

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      if (jobId === req.params.jobId) {
        send('error', { message: failedReason });                                                                                                                                                           
        res.end();
      }                                                                                                                                                                                                     
    });                                                     

    req.on('close', () => queueEvents.close());                                                                                                                                                             
  });
                                                                                                                                                                                                            
  Frontend hook:                                            

  // src/hooks/useRealtimeProgress.ts
  export const useRealtimeProgress = (jobId: string | null) => {
    const [progress, setProgress] = useState<ProgressState | null>(null);                                                                                                                                   
  
    useEffect(() => {                                                                                                                                                                                       
      if (!jobId) return;                                   
      const es = new EventSource(`/api/v1/jobs/${jobId}/stream`);                                                                                                                                           
      es.addEventListener('progress', e => setProgress(JSON.parse(e.data)));
      es.addEventListener('completed', e => { setProgress(JSON.parse(e.data)); es.close(); });                                                                                                              
      es.addEventListener('error', () => es.close());       
      return () => es.close();                                                                                                                                                                              
    }, [jobId]);                                            
                                                                                                                                                                                                            
    return progress;                                        
  };

  Recruiter impact: Real-time features, event-driven architecture, SSE vs WebSocket trade-off knowledge — these are senior-level signals.                                                                   
   
  ---                                                                                                                                                                                                       
  🟡 MEDIUM IMPACT — Phase 2 (Weeks 3–4)                    
                                                                                                                                                                                                            
  ---
  7. Authentication with Auth.js (NextAuth v5)                                                                                                                                                              
                                                                                                                                                                                                            
  Why it matters: Without auth, every analysis is anonymous and disposable. Auth enables user dashboards, history, personalization — the entire SaaS value proposition.
                                                                                                                                                                                                            
  Tech: next-auth (v5 / Auth.js), Google OAuth + email magic link                                                                                                                                           
                                                                                                                                                                                                            
  // src/app/api/auth/[...nextauth]/route.ts                                                                                                                                                                
  import NextAuth from 'next-auth';                                                                                                                                                                         
  import Google from 'next-auth/providers/google';
  import Resend from 'next-auth/providers/resend';                                                                                                                                                          
  import { PrismaAdapter } from '@auth/prisma-adapter';                                                                                                                                                     
  import { prisma } from '@/lib/prisma';
                                                                                                                                                                                                            
  export const { handlers, auth, signIn, signOut } = NextAuth({                                                                                                                                             
    adapter: PrismaAdapter(prisma),
    providers: [                                                                                                                                                                                            
      Google({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }),
      Resend({ apiKey: env.RESEND_API_KEY, from: 'auth@ats-analyzer.com' }),                                                                                                                                
    ],
    callbacks: {                                                                                                                                                                                            
      session: ({ session, user }) => ({                                                                                                                                                                    
        ...session,
        user: { ...session.user, id: user.id },                                                                                                                                                             
      }),                                                   
    },
  });                                                                                                                                                                                                       
  
  Backend JWT middleware for API routes:                                                                                                                                                                    
                                                            
  // src/middleware/auth.middleware.ts
  import jwt from 'jsonwebtoken';                                                                                                                                                                           
  
  export const authMiddleware = {                                                                                                                                                                           
    required: (req, res, next) => {                         
      const token = req.cookies['next-auth.session-token']
        || req.headers.authorization?.replace('Bearer ', '');                                                                                                                                               
      if (!token) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      // verify and attach user                                                                                                                                                                             
      next();                                               
    },                                                                                                                                                                                                      
    optional: (req, res, next) => {                         
      // attach user if token present, continue either way                                                                                                                                                  
      next();                                                                                                                                                                                               
    },
  };                                                                                                                                                                                                        
                                                            
  ---
  8. Enhanced ATS Scoring Engine
                                
  Why it matters: Your current scoring is keyword count / 15 * 70. That is not ATS analysis — that's ctrl+F. Real ATS engines (Workday, Greenhouse, Lever) use TF-IDF, semantic similarity, section parsing,
   and formatting analysis.                                                                                                                                                                                 
   
  Improvements:                                                                                                                                                                                             
                                                            
  // src/services/resume/analyzer.service.ts
                                                                                                                                                                                                            
  interface AnalysisResult {
    score: number;                                                                                                                                                                                          
    breakdown: {                                            
      keywordScore: number;       // 0-40: exact + semantic keyword match
      achievementScore: number;   // 0-25: quantified results detection                                                                                                                                     
      formattingScore: number;    // 0-20: ATS-friendly structure                                                                                                                                           
      readabilityScore: number;   // 0-15: sentence complexity, bullet length                                                                                                                               
    };                                                                                                                                                                                                      
    matchedKeywords: string[];                                                                                                                                                                              
    missingKeywords: string[];    // NEW: tell users exactly what's missing                                                                                                                                 
    keywordDensity: number;       // keyword density percentage                                                                                                                                             
    sectionDetected: {            // NEW: section presence                                                                                                                                                  
      summary: boolean;                                                                                                                                                                                     
      experience: boolean;                                                                                                                                                                                  
      education: boolean;                                                                                                                                                                                   
      skills: boolean;                                      
      projects: boolean;
    };
    warnings: string[];           // NEW: specific ATS failure reasons
    suggestions: string[];                                                                                                                                                                                  
  }
                                                                                                                                                                                                            
  // Semantic keyword matching using embedding similarity:                                                                                                                                                  
  const semanticMatch = async (resumeText: string, keywords: string[]) => {
    // Use Gemini embeddings API to find semantically similar terms                                                                                                                                         
    // e.g., "Node.js" matches "server-side JavaScript", "backend JS"                                                                                                                                       
    const embeddings = await gemini.embedContent(resumeText);                                                                                                                                               
    // cosine similarity matching                                                                                                                                                                           
  };                                                                                                                                                                                                        
                                                            
  // ATS formatting checks:                                                                                                                                                                                 
  const formattingChecks = (text: string): string[] => {    
    const warnings = [];
    if (/[│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌]/u.test(text))                                                                                                                                           
      warnings.push('Tables detected — ATS cannot parse table content');                                                                                                                                    
    if (text.length < 400)                                                                                                                                                                                  
      warnings.push('Resume appears too short — add more detail');                                                                                                                                          
    if (!/\b(19|20)\d{2}\b/.test(text))                                                                                                                                                                     
      warnings.push('No dates detected — add employment date ranges');                                                                                                                                      
    if (!/\b\d+[%x]\b|\$[\d,]+|\d+\+\s*(years?|clients?|projects?)/i.test(text))                                                                                                                            
      warnings.push('No quantified achievements — add metrics (%, $, numbers)');                                                                                                                            
    if ((text.match(/\b(responsible for|duties included|worked on)\b/gi) || []).length > 2)                                                                                                                 
      warnings.push('Weak phrasing detected — replace with action verbs');                                                                                                                                  
    return warnings;                                                                                                                                                                                        
  };                                                                                                                                                                                                        
                                                                                                                                                                                                            
  Add more domains: Expand keywords.json to 25+ domains with 50+ keywords each, covering: Data Engineering, Mobile (iOS/Android), Cloud Architecture, Product Management, UI/UX Design, Blockchain, ML      
  Engineering, SRE, etc.
                                                                                                                                                                                                            
  ---                                                       
  9. AI-Powered Keyword Gap Analysis
                                    
  Why it matters: "You scored 65%" is useless. "You're missing 8 keywords the JD requires: Kubernetes, Terraform, SLO/SLI, incident management — here's how to add them" is actionable gold.
                                                                                                                                                                                                            
  Implementation:
                                                                                                                                                                                                            
  // src/services/ai/prompts/keyword-gap.ts                 
  export const keywordGapPrompt = (resumeText: string, jd: string) => `                                                                                                                                     
  You are an ATS expert. Compare the resume against the job description.                                                                                                                                    
                                                                                                                                                                                                            
  Return ONLY valid JSON matching this schema:                                                                                                                                                              
  {                                                                                                                                                                                                         
    "criticalMissing": ["keyword that appears 3+ times in JD but not in resume"],
    "nicetohaveMissing": ["keyword appears once in JD, not in resume"],                                                                                                                                     
    "presentKeywords": ["keywords found in both"],                                                                                                                                                          
    "keywordDensityIssues": ["keywords present but underutilized"],                                                                                                                                         
    "overusedPhrases": ["clichés that weaken the resume"],                                                                                                                                                  
    "recommendedAdditions": [                                                                                                                                                                               
      { "keyword": "...", "where": "Skills section", "example": "Managed Kubernetes clusters across 3 environments" }                                                                                       
    ]                                                                                                                                                                                                       
  }                                                                                                                                                                                                         
                                                                                                                                                                                                            
  RESUME: ${resumeText}                                     
  JOB DESCRIPTION: ${jd}
  `;

  Gemini with structured output (JSON mode):                                                                                                                                                                
   
  const result = await model.generateContent({                                                                                                                                                              
    contents: [{ role: 'user', parts: [{ text: prompt }] }],                                                                                                                                                
    generationConfig: {
      responseMimeType: 'application/json',  // Gemini 1.5 structured output                                                                                                                                
      responseSchema: KeywordGapSchema,       // Zod schema → JSON Schema                                                                                                                                   
    },                                                                                                                                                                                                      
  });                                                                                                                                                                                                       
                                                                                                                                                                                                            
  ---                                                       
  10. User Dashboard with Analysis History
                                          
  Why it matters: The entire point of a SaaS is that users come back. A dashboard showing score trends over time is the #1 retention feature.
                                                                                                                                                                                                            
  // src/app/dashboard/page.tsx — key data points:
  // - Score trend chart (Recharts/Victory) across all analyses                                                                                                                                             
  // - Last 5 resume versions side-by-side score comparison                                                                                                                                                 
  // - Keyword gap heatmap: which skills appear most across all their JDs                                                                                                                                   
  // - Domain distribution: what roles they're applying for                                                                                                                                                 
  // - "Your best performing resume" highlight                                                                                                                                                              
                                                                                                                                                                                                            
  API endpoint:                                                                                                                                                                                             
                                                                                                                                                                                                            
  // GET /api/v1/users/:id/analytics                        
  {                                                                                                                                                                                                         
    "totalAnalyses": 12,
    "avgScore": 67,                                                                                                                                                                                         
    "scoreImprovement": +15,        // since first analysis                                                                                                                                                 
    "topMissingKeywords": ["Kubernetes", "Terraform", "gRPC"],
    "scoreOverTime": [                                                                                                                                                                                      
      { "date": "2026-05-01", "score": 52, "domain": "DevOps" },
      { "date": "2026-05-07", "score": 67, "domain": "DevOps" }                                                                                                                                             
    ],                                                                                                                                                                                                      
    "bestScore": { "score": 84, "analysisId": "..." }                                                                                                                                                       
  }                                                                                                                                                                                                         
                                                            
  ---                                                                                                                                                                                                       
  11. Resume Versioning + Side-by-Side Comparison           
                                                                                                                                                                                                            
  Why it matters: Users iterate on their resumes. Showing "Version 3 scored 12 points higher than Version 1 because you added these 4 keywords" is a killer feature no free competitor has.
                                                                                                                                                                                                            
  // GET /api/v1/resumes/:id/versions                       
  // GET /api/v1/analyses/compare?ids=id1,id2                                                                                                                                                               
                                                                                                                                                                                                            
  // Frontend: side-by-side diff viewer                                                                                                                                                                     
  // Use diff-match-patch or react-diff-viewer to show exactly what changed                                                                                                                                 
  // Overlay score delta: "Adding 'TypeScript' and 'REST API' added +8 points"                                                                                                                              
                                                                                                                                                                                                            
  ---                                                                                                                                                                                                       
  12. PDF Export of Rewritten Resume                                                                                                                                                                        
                                                            
  Why it matters: Right now the rewritten resume arrives by email as a plain <pre> block. Users need a download-ready, beautifully formatted PDF.
                                                                                                                                                                                                            
  Tech: @react-pdf/renderer (frontend) or puppeteer (backend)                                                                                                                                               
                                                                                                                                                                                                            
  // src/services/resume/pdfExport.service.ts                                                                                                                                                               
  import puppeteer from 'puppeteer';                        

  export const generateResumePDF = async (rewrittenText: string, userName: string) => {                                                                                                                     
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();                                                                                                                                                                   
                                                                                                                                                                                                            
    // Render a clean HTML template
    await page.setContent(buildResumeHTML(rewrittenText, userName));                                                                                                                                        
                                                                                                                                                                                                            
    const pdf = await page.pdf({
      format: 'A4',                                                                                                                                                                                         
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,                                                                                                                                                                                
    });
                                                                                                                                                                                                            
    await browser.close();                                  
    return pdf; // Buffer — can be returned as download or attached to email
  };                                                                                                                                                                                                        
   
  ---                                                                                                                                                                                                       
  13. AI Chat Assistant (Context-Aware Resume Q&A)          
                                                                                                                                                                                                            
  Why it matters: This is a 2026 differentiator. "Ask AI" about any part of the resume in a chat interface: "How do I improve my skills section for a DevOps role?" — the AI has full context of their
  resume and the JD.                                                                                                                                                                                        
                                                            
  Tech: Gemini chat API (startChat) + Zustand chat store + streaming                                                                                                                                        
                                                            
  // src/services/ai/gemini.service.ts                                                                                                                                                                      
  export const startResumeChat = async (resumeText: string, analysisResult: AnalysisResult) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });                                                                                                                                  
                                                                                                                                                                                                            
    const systemContext = `You are an expert resume coach. You have access to the candidate's resume                                                                                                        
  and their ATS analysis results. Help them improve their resume specifically.                                                                                                                              
                                                                                                                                                                                                            
  RESUME: ${resumeText}                                     
  ATS SCORE: ${analysisResult.score}/100                                                                                                                                                                    
  MISSING KEYWORDS: ${analysisResult.missingKeywords.join(', ')}                                                                                                                                            
  DOMAIN: ${analysisResult.domain}
                                                                                                                                                                                                            
  Answer questions specifically about THIS resume. Give concrete, actionable advice.`;
                                                                                                                                                                                                            
    return model.startChat({                                                                                                                                                                                
      history: [{ role: 'user', parts: [{ text: systemContext }] }],                                                                                                                                        
      generationConfig: { maxOutputTokens: 1000 },                                                                                                                                                          
    });                                                                                                                                                                                                     
  };
                                                                                                                                                                                                            
  // Stream the response token by token                     
  const stream = await chat.sendMessageStream(userMessage);
  for await (const chunk of stream) {                                                                                                                                                                       
    res.write(chunk.text());
  }                                                                                                                                                                                                         
                                                            
  ---
  🟢 OPTIONAL — Phase 3–4 (Production Polish)

  ---
  14. Docker + Docker Compose

  Tech: Multi-stage Dockerfile for lean production images

  # backend/Dockerfile
  FROM node:20-alpine AS base
  WORKDIR /app

  FROM base AS deps
  COPY package*.json ./
  RUN npm ci --only=production

  FROM base AS builder
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  FROM base AS runner
  ENV NODE_ENV=production
  COPY --from=deps /app/node_modules ./node_modules
  COPY --from=builder /app/dist ./dist
  COPY prisma ./prisma                                                                                                                                                                                      
  EXPOSE 5000
  CMD ["node", "dist/server.js"]                                                                                                                                                                            
                                                            
  # docker-compose.yml                                                                                                                                                                                      
  version: '3.9'
                                                                                                                                                                                                            
  services:                                                 
    postgres:
      image: postgres:16-alpine
      environment:
        POSTGRES_DB: ats_analyzer
        POSTGRES_USER: ${DB_USER}
        POSTGRES_PASSWORD: ${DB_PASSWORD}                                                                                                                                                                   
      volumes:
        - postgres_data:/var/lib/postgresql/data                                                                                                                                                            
      healthcheck:                                          
        test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]                                                                                                                                                     
        interval: 5s
                                                                                                                                                                                                            
    redis:                                                  
      image: redis:7-alpine
      command: redis-server --requirepass ${REDIS_PASSWORD}
      volumes:                                                                                                                                                                                              
        - redis_data:/data
                                                                                                                                                                                                            
    backend:                                                
      build: ./backend
      depends_on:
        postgres: { condition: service_healthy }
        redis:    { condition: service_started }                                                                                                                                                            
      environment:
        DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/ats_analyzer                                                                                                                     
        REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379                                                                                                                                                    
      ports: ["5000:5000"]
                                                                                                                                                                                                            
    frontend:                                               
      build: ./frontend
      environment:                                                                                                                                                                                          
        NEXT_PUBLIC_API_URL: http://backend:5000
      ports: ["3000:3000"]                                                                                                                                                                                  
                                                            
  volumes:
    postgres_data:
    redis_data:                                                                                                                                                                                             
   
  ---                                                                                                                                                                                                       
  15. GitHub Actions CI/CD                                  

  # .github/workflows/ci.yml
  name: CI
  on: [push, pull_request]                                                                                                                                                                                  
   
  jobs:                                                                                                                                                                                                     
    backend:                                                
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:16
          env: { POSTGRES_PASSWORD: test, POSTGRES_DB: ats_test }
          options: --health-cmd pg_isready                                                                                                                                                                  
        redis:                                                                                                                                                                                              
          image: redis:7                                                                                                                                                                                    
          options: --health-cmd "redis-cli ping"                                                                                                                                                            
      steps:                                                
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4                                                                                                                                                                       
          with: { node-version: '20', cache: 'npm' }
        - run: npm ci                                                                                                                                                                                       
          working-directory: backend                        
        - run: npm run typecheck                                                                                                                                                                            
          working-directory: backend
        - run: npm run lint                                                                                                                                                                                 
          working-directory: backend                        
        - run: npx prisma migrate deploy
          working-directory: backend                                                                                                                                                                        
          env: { DATABASE_URL: postgresql://postgres:test@localhost:5432/ats_test }
        - run: npm test                                                                                                                                                                                     
          working-directory: backend                                                                                                                                                                        
   
    frontend:                                                                                                                                                                                               
      runs-on: ubuntu-latest                                
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20', cache: 'npm' }
        - run: npm ci && npm run build                                                                                                                                                                      
          working-directory: frontend
                                                                                                                                                                                                            
  ---                                                       
  16. Request Tracing + Sentry Error Monitoring
                                                                                                                                                                                                            
  // src/middleware/requestLogger.middleware.ts
  import { v4 as uuid } from 'uuid';                                                                                                                                                                        
  import { logger } from '../lib/logger';                   
                                                                                                                                                                                                            
  export const requestLogger = (req, res, next) => {                                                                                                                                                        
    req.id = uuid();
    res.setHeader('X-Request-Id', req.id);                                                                                                                                                                  
                                                            
    const start = Date.now();                                                                                                                                                                               
    res.on('finish', () => {
      logger.info({                                                                                                                                                                                         
        requestId: req.id,                                  
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,                                                                                                                                                                         
        durationMs: Date.now() - start,
        ip: req.ip,                                                                                                                                                                                         
        userAgent: req.headers['user-agent'],               
      });
    });                                                                                                                                                                                                     
    next();
  };                                                                                                                                                                                                        
                                                            
  // Sentry integration:
  import * as Sentry from '@sentry/node';
  Sentry.init({ dsn: env.SENTRY_DSN, tracesSampleRate: 0.1 });                                                                                                                                              
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler()); // before your custom errorHandler                                                                                                                               
                                                                                                                                                                                                            
  ---                                                                                                                                                                                                       
  17. Frontend: Zustand State + Typed API Client                                                                                                                                                            
                                                                                                                                                                                                            
  // src/lib/api.ts — typed, centralized API client
  import ky from 'ky';                                                                                                                                                                                      
                                                                                                                                                                                                            
  const api = ky.create({
    prefixUrl: process.env.NEXT_PUBLIC_API_URL,                                                                                                                                                             
    credentials: 'include',                                 
    hooks: {                                                                                                                                                                                                
      beforeRequest: [
        request => {                                                                                                                                                                                        
          // attach auth token from cookie session automatically
        }                                                                                                                                                                                                   
      ],
      afterResponse: [                                                                                                                                                                                      
        async (request, options, response) => {             
          if (!response.ok) {                                                                                                                                                                               
            const error = await response.json();
            throw new ApiError(error.error.message, response.status);                                                                                                                                       
          }                                                 
        }                                                                                                                                                                                                   
      ],                                                    
    },
  });

  export const resumeApi = {                                                                                                                                                                                
    upload: (formData: FormData) =>
      api.post('api/v1/resume/upload', { body: formData }).json<UploadResponse>(),                                                                                                                          
                                                                                                                                                                                                            
    getJobStatus: (jobId: string) =>
      api.get(`api/v1/jobs/${jobId}`).json<JobStatus>(),                                                                                                                                                    
                                                                                                                                                                                                            
    getAnalysisHistory: () =>
      api.get('api/v1/analyses').json<Analysis[]>(),                                                                                                                                                        
                                                            
    compareAnalyses: (ids: string[]) =>                                                                                                                                                                     
      api.get('api/v1/analyses/compare', { searchParams: { ids } }).json<ComparisonResult>(),
  };                                                                                                                                                                                                        
                                                            
  // src/stores/analysisStore.ts                                                                                                                                                                            
  import { create } from 'zustand';                         
  import { devtools, persist } from 'zustand/middleware';

  interface AnalysisStore {
    currentJobId: string | null;
    currentAnalysis: Analysis | null;                                                                                                                                                                       
    history: Analysis[];
    mode: 'analyze' | 'rewrite';                                                                                                                                                                            
    setMode: (m: 'analyze' | 'rewrite') => void;            
    setJobId: (id: string) => void;                                                                                                                                                                         
    setAnalysis: (a: Analysis) => void;
    reset: () => void;                                                                                                                                                                                      
  }                                                         
                                                                                                                                                                                                            
  export const useAnalysisStore = create<AnalysisStore>()(
    devtools(                                                                                                                                                                                               
      persist(                                              
        (set) => ({
          currentJobId: null,
          currentAnalysis: null,
          history: [],
          mode: 'analyze',                                                                                                                                                                                  
          setMode: (mode) => set({ mode }),
          setJobId: (id) => set({ currentJobId: id }),                                                                                                                                                      
          setAnalysis: (a) => set(s => ({ currentAnalysis: a, history: [a, ...s.history].slice(0, 50) })),
          reset: () => set({ currentJobId: null, currentAnalysis: null }),                                                                                                                                  
        }),
        { name: 'ats-analysis', partialize: (s) => ({ history: s.history }) },                                                                                                                              
      ),                                                                                                                                                                                                    
    ),
  );                                                                                                                                                                                                        
                                                            
  ---
  18. API Versioning + Typed Request Validation (Zod)
                                                                                                                                                                                                            
  // src/api/v1/routes/resume.routes.ts
  import { z } from 'zod';                                                                                                                                                                                  
                                                                                                                                                                                                            
  const uploadSchema = z.object({
    name:           z.string().min(2).max(100),                                                                                                                                                             
    email:          z.string().email(),                     
    domain:         z.enum(['node.js', 'react', 'python', 'devops', ...]),                                                                                                                                  
    mode:           z.enum(['analyze', 'rewrite']).default('analyze'),                                                                                                                                      
    jobDescription: z.string().min(50).max(10000).optional(),                                                                                                                                               
  }).refine(                                                                                                                                                                                                
    (d) => d.mode === 'analyze' || !!d.jobDescription,      
    { message: 'jobDescription required in rewrite mode', path: ['jobDescription'] }                                                                                                                        
  );                                                                                                                                                                                                        
   
  router.post(                                                                                                                                                                                              
    '/upload',                                              
    uploadLimiter,
    authMiddleware.optional,                                                                                                                                                                                
    validateBody(uploadSchema),  // middleware wrapping zod.parse
    resumeController.upload,                                                                                                                                                                                
  );                                                        
                                                                                                                                                                                                            
  ---                                                       
  19. Improve AI Prompt Engineering (Chain-of-Thought + Structured Output)
                                                                                                                                                                                                            
  Current prompt weakness: Single-shot, no structure, no examples, no reasoning chain.
                                                                                                                                                                                                            
  Production-grade approach:                                
                                                                                                                                                                                                            
  // src/services/ai/prompts/rewrite.prompt.ts              
  export const buildRewritePrompt = (resume: string, jd: string, analysis: AnalysisResult) => `
  <system>                                                                                                                                                                                                  
  You are a FAANG-level resume coach and ATS optimization specialist.
  You have already analyzed this resume and know exactly what is missing.                                                                                                                                   
  </system>                                                 
                                                                                                                                                                                                            
                                                            
  <task>                                                                                                                                                                                                    
  Rewrite the resume below to achieve an ATS score above 85/100 for the job description provided.
                                                                                                                                                                                                            
  Step 1: Identify the top 10 keywords from the JD that are missing from the resume.
  Step 2: For each experience bullet, determine if a JD keyword can be truthfully incorporated.                                                                                                             
  Step 3: Rewrite each bullet starting with a strong action verb, incorporating 1-2 keywords.                                                                                                               
  Step 4: Rewrite the professional summary to mirror the JD's language exactly.                                                                                                                             
  Step 5: Ensure the skills section contains all critical keywords from the JD.                                                                                                                             
  </task>                                                                                                                                                                                                   
                                                                                                                                                                                                            
  <constraints>                                                                                                                                                                                             
  - Do NOT fabricate experience, certifications, or companies
  - Use plain text only — no markdown, no tables, no bullets with • or * symbols                                                                                                                            
  - Use standard section headers: PROFESSIONAL SUMMARY, EXPERIENCE, EDUCATION, SKILLS                                                                                                                       
  - Maximum bullet length: 2 lines                                                                                                                                                                          
  - Include at least 3 quantified achievements (%, $, numbers)                                                                                                                                              
  </constraints>                                                                                                                                                                                            
                                                                                                                                                                                                            
  <resume>${resume}</resume>                                
  <job_description>${jd}</job_description>                                                                                                                                                                  
  
  Output the complete rewritten resume only. No commentary.                                                                                                                                                 
  `;                                                                                                                                                                                                        
  
  ---                                                                                                                                                                                                       
  Section 4: Implementation Roadmap                         
                                   
  Phase 1 — Critical Foundation (Week 1–2)
                                                                                                                                                                                                            
  Goal: Make it production-worthy, not just a demo.                                                                                                                                                         
                                                                                                                                                                                                            
  ┌─────┬─────────────────────────────────────────────────┬──────────────────────────────────────┬────────┬──────────┐                                                                                      
  │  #  │                      Task                       │               Packages               │ Effort │  Impact  │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 1   │ Migrate backend to TypeScript                   │ typescript, ts-node, tsx             │ 4h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 2   │ Zod env validation                              │ zod                                  │ 1h     │ High     │                                                                                      
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤
  │ 3   │ Custom error classes + error handler middleware │ —                                    │ 2h     │ High     │                                                                                      
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 4   │ Winston structured logging + request tracer     │ winston, uuid                        │ 2h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 5   │ PostgreSQL + Prisma setup                       │ prisma, PostgreSQL                   │ 4h     │ Critical │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 6   │ API versioning (/api/v1/)                       │ —                                    │ 1h     │ Medium   │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 7   │ Zod request validation middleware               │ zod                                  │ 2h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 8   │ Rate limiting with Redis store                  │ express-rate-limit, rate-limit-redis │ 2h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 9   │ Helmet + CORS lockdown                          │ helmet                               │ 1h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 10  │ Add start + dev + typecheck scripts             │ tsx, nodemon                         │ 30m    │ Medium   │
  └─────┴─────────────────────────────────────────────────┴──────────────────────────────────────┴────────┴──────────┘                                                                                      
                                                            
  Deliverable: A backend that won't embarrass you in a code review.                                                                                                                                         
                                                            
  ---                                                                                                                                                                                                       
  Phase 2 — AI & Feature Enhancements (Week 3–4)            
                                                                                                                                                                                                            
  Goal: Turn it into something genuinely impressive.
                                                                                                                                                                                                            
  ┌─────┬───────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────┬────────┬──────────┐
  │  #  │                                     Task                                      │             Packages             │ Effort │  Impact  │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 1   │ BullMQ + Redis job queue for async processing                                 │ bullmq, ioredis                  │ 6h     │ Critical │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 2   │ SSE real-time progress updates                                                │ —                                │ 3h     │ High     │                                                            
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤
  │ 3   │ Enhanced ATS scoring (formatting checks, section detection, missing keywords) │ —                                │ 4h     │ High     │                                                            
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 4   │ AI keyword gap analysis (structured JSON output from Gemini)                  │ —                                │ 3h     │ High     │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 5   │ Improve AI prompts (CoT, constraints, structured output)                      │ —                                │ 2h     │ High     │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 6   │ Auth.js + Google OAuth                                                        │ next-auth, @auth/prisma-adapter  │ 5h     │ High     │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 7   │ User dashboard + analysis history                                             │ recharts                         │ 6h     │ High     │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 8   │ PDF export of rewritten resume                                                │ puppeteer or @react-pdf/renderer │ 4h     │ Medium   │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 9   │ Zustand state store + typed API client                                        │ zustand, ky                      │ 3h     │ Medium   │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 10  │ Split UploadSection into 5 focused components                                 │ —                                │ 2h     │ Medium   │
  └─────┴───────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────┴────────┴──────────┘                                                            
                                                            
  Deliverable: Something you'd genuinely demo to a hiring manager.                                                                                                                                          
                                                            
  ---                                                                                                                                                                                                       
  Phase 3 — SaaS Scalability (Week 5–6)                     

  Goal: Show you understand production systems.

  ┌─────┬─────────────────────────────────────────────────────┬───────────────────┬────────┬────────┐                                                                                                       
  │  #  │                        Task                         │     Packages      │ Effort │ Impact │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 1   │ Docker + Docker Compose (all services)              │ docker            │ 4h     │ High   │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤
  │ 2   │ GitHub Actions CI (typecheck + lint + test + build) │ —                 │ 3h     │ High   │                                                                                                       
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 3   │ Unit tests for analyzer + AI services               │ vitest, supertest │ 6h     │ High   │                                                                                                       
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 4   │ Resume versioning + side-by-side comparison         │ diff-match-patch  │ 4h     │ Medium │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 5   │ AI chat assistant (Gemini chat API + streaming)     │ —                 │ 5h     │ Medium │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 6   │ Redis response caching for analysis results         │ ioredis           │ 2h     │ Medium │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 7   │ Sentry error monitoring                             │ @sentry/node      │ 2h     │ Medium │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 8   │ Expand keywords.json to 25+ domains                 │ —                 │ 4h     │ Medium │
  └─────┴─────────────────────────────────────────────────────┴───────────────────┴────────┴────────┘                                                                                                       
                                                            
  Deliverable: A GitHub repo a senior engineer can clone and run with docker compose up.                                                                                                                    
   
  ---                                                                                                                                                                                                       
  Phase 4 — Enterprise Polish (Week 7–8)                    
                                                                                                                                                                                                            
  Goal: Recruiter-wow finishing touches.
                                                                                                                                                                                                            
  ┌─────┬──────────────────────────────────────────────────┬─────────────────────────┬──────────┐                                                                                                           
  │  #  │                       Task                       │        Packages         │  Impact  │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 1   │ Score trend chart with Recharts on dashboard     │ recharts                │ High     │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤
  │ 2   │ LinkedIn Job URL auto-fetch (scrape JD from URL) │ cheerio                 │ High     │                                                                                                           
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 3   │ Multiple resume templates for PDF export         │ —                       │ Medium   │                                                                                                           
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 4   │ Admin panel: all submissions, usage analytics    │ —                       │ Medium   │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 5   │ OpenTelemetry tracing                            │ @opentelemetry/sdk-node │ Medium   │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 6   │ Webhook support (Zapier/Make integration)        │ —                       │ Optional │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 7   │ Free tier limits + premium gate (Stripe ready)   │ stripe                  │ Optional │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 8   │ Playwright E2E tests for critical flows          │ playwright              │ Medium   │
  └─────┴──────────────────────────────────────────────────┴─────────────────────────┴──────────┘                                                                                                           
                                                            
  ---                                                                                                                                                                                                       
  Section 5: Quick Wins You Can Ship Today                  
                                          
  These require 30–60 minutes each and immediately improve code quality:
                                                                                                                                                                                                            
  // 1. Add start script to backend/package.json
  "scripts": {                                                                                                                                                                                              
    "start": "node dist/server.js",                         
    "dev": "tsx watch src/server.ts",                                                                                                                                                                       
    "build": "tsc",                                                                                                                                                                                         
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",                                                                                                                                                                                  
    "test": "vitest"                                        
  }                                                                                                                                                                                                         
  
  // 2. Fix: CORS is wide open                                                                                                                                                                              
  // Change: app.use(cors())                                
  // To:                                                                                                                                                                                                    
  app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
                                                                                                                                                                                                            
  // 3. Fix: hardcoded localhost in frontend                                                                                                                                                                
  // Change: fetch('http://localhost:5000/api/upload', ...)
  // To:                                                                                                                                                                                                    
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  fetch(`${API_URL}/api/upload`, ...)                                                                                                                                                                       
  
  // 4. Fix: no retry on Gemini calls                                                                                                                                                                       
  const result = await retry(                               
    () => model.generateContent(prompt),                                                                                                                                                                    
    { retries: 3, factor: 2, minTimeout: 1000 }                                                                                                                                                             
  );  // use 'async-retry' package
                                                                                                                                                                                                            
  // 5. Fix: email sent synchronously (wrap in setImmediate or queue)                                                                                                                                       
  // Don't await email in the response path:                                                                                                                                                                
  setImmediate(() => emailService.send(...));  // fire-and-forget                                                                                                                                           
  // Or better: add to BullMQ queue                                                                                                                                                                         
                                                                                                                                                                                                            
  // 6. Add .env.example to the repo (remove actual secrets from README)                                                                                                                                    
  // 7. Add .gitignore entry for *.log, uploads/, dist/     
                                                                                                                                                                                                            
  ---                                                       
  Final Assessment                                                                                                                                                                                          
                                                                                                                                                                                                            
  ┌──────────────────────────┬─────────┬───────────────┬───────────────┬───────────────┐
  │         Category         │ Current │ After Phase 1 │ After Phase 2 │ After Phase 4 │                                                                                                                    
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤
  │ Architecture             │ 3/10    │ 7/10          │ 8/10          │ 9/10          │                                                                                                                    
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤
  │ AI Depth                 │ 5/10    │ 5/10          │ 8/10          │ 9/10          │                                                                                                                    
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤                                                                                                                    
  │ Production Readiness     │ 2/10    │ 7/10          │ 8/10          │ 9/10          │                                                                                                                    
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤                                                                                                                    
  │ Security                 │ 2/10    │ 8/10          │ 8/10          │ 9/10          │
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤                                                                                                                    
  │ Let me read the full codebase before analyzing anything.
                                                                            
  Searched for 2 patterns, read 6 files (ctrl+o to expand)     
                                                                                                                                                                                                            
⏺ I have a complete picture of the entire stack. Let me write the full audit and roadmap now.                                                                                                               
                                                                                                                                                                                                            
  ---                                                                                                                                                                                                     
  ATS Resume Analyzer — Senior Engineer Audit & 2026 SaaS Upgrade Roadmap                                                                                                                                   
                                                                                                                                                                                                            
  Section 1: Current Architecture Audit                                                                                                                                                                     
                                                                                                                                                                                                            
  What you have (honestly assessed)                                                                                                                                                                         
                                                                                                                                                                                                            
  BACKEND                                                                                                                                                                                                   
  ├── server.js              ← monolithic entry, no middleware stack                                                                                                                                        
  ├── controllers/                                                                                                                                                                                          
  │   └── uploadController.js ← does parsing + analysis + email + telegram in one fn
  ├── services/                                                                                                                                                                                             
  │   ├── analyzerService.js  ← keyword match only, no ML, no semantic scoring
  │   ├── aiService.js        ← single Gemini call, no retry, no streaming                                                                                                                                  
  │   ├── emailService.js     ← no queue, sends synchronously blocking the response
  │   └── telegramService.js  ← fire-and-forget, no error recovery                                                                                                                                          
  └── config/                                                                                                                                                                                               
      └── keywords.json       ← 8 domains, ~10 keywords each — far too sparse                                                                                                                               
                                                                                                                                                                                                            
  FRONTEND                                                  
  └── src/                                                                                                                                                                                                  
      ├── app/page.tsx         ← landing + all sections in one file
      └── components/                                                                                                                                                                                       
          └── UploadSection.tsx ← entire wizard, all state, all API calls in one 700-line component
                                                                                                                                                                                                            
  INFRASTRUCTURE                                            
  └── Nothing — no DB, no cache, no queue, no auth, no Docker, no CI/CD                                                                                                                                     
                                                                                                                                                                                                            
  Critical gaps vs a real 2026 SaaS product                                                                                                                                                                 
                                                                                                                                                                                                            
  ┌────────────────────────────────────────────┬──────────┬────────────────────────────────┐                                                                                                                
  │                    Gap                     │ Severity │ Impact on Recruiter Impression │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No database — nothing persists             │ Critical │ Disqualifying                  │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No authentication                          │ Critical │ Disqualifying                  │                                                                                                                
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤
  │ Email sent synchronously — blocks response │ Critical │ Poor architecture signal       │                                                                                                                
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ CORS: app.use(cors()) — fully open         │ Critical │ Security red flag              │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No rate limiting — trivially abused        │ High     │ Production gap                 │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ keywords.json is the "AI engine"           │ High     │ Not impressive                 │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ Hardcoded localhost:5000 in frontend       │ High     │ Amateur signal                 │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No API versioning                          │ High     │ Architecture gap               │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No logging or observability                │ High     │ Not production-ready           │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No error handling middleware               │ High     │ Code quality signal            │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ Backend is plain JS (no TypeScript)        │ Medium   │ Quality signal                 │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No tests whatsoever                        │ Medium   │ Professional gap               │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No Docker                                  │ Medium   │ DevOps gap                     │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No CI/CD                                   │ Medium   │ DevOps gap                     │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤
  │ Single component 700+ lines                │ Medium   │ Frontend architecture          │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No env validation (typos crash silently)   │ Medium   │ Reliability gap                │
  └────────────────────────────────────────────┴──────────┴────────────────────────────────┘                                                                                                                
                                                            
  ---                                                                                                                                                                                                       
  Section 2: Proposed Production Architecture               

  ats-analyzer/
  ├── backend/                          ← Node.js + TypeScript + Express
  │   ├── src/                                                                                                                                                                                              
  │   │   ├── api/
  │   │   │   └── v1/                                                                                                                                                                                       
  │   │   │       ├── routes/                               
  │   │   │       │   ├── auth.routes.ts                                                                                                                                                                    
  │   │   │       │   ├── resume.routes.ts                  
  │   │   │       │   ├── analysis.routes.ts                                                                                                                                                                
  │   │   │       │   └── user.routes.ts
  │   │   │       └── index.ts                                                                                                                                                                              
  │   │   ├── controllers/                                  
  │   │   │   ├── auth.controller.ts                                                                                                                                                                        
  │   │   │   ├── resume.controller.ts                      
  │   │   │   └── analysis.controller.ts                                                                                                                                                                    
  │   │   ├── services/
  │   │   │   ├── resume/                                                                                                                                                                                   
  │   │   │   │   ├── parser.service.ts     ← PDF/DOCX extraction                                                                                                                                           
  │   │   │   │   ├── analyzer.service.ts   ← ATS scoring engine
  │   │   │   │   └── rewriter.service.ts   ← Gemini AI rewrite                                                                                                                                             
  │   │   │   ├── ai/                                                                                                                                                                                       
  │   │   │   │   ├── gemini.service.ts     ← Gemini client + retry logic                                                                                                                                   
  │   │   │   │   └── prompts/              ← prompt templates as files                                                                                                                                     
  │   │   │   ├── queue/                                                                                                                                                                                    
  │   │   │   │   ├── queue.service.ts      ← BullMQ setup                                                                                                                                                  
  │   │   │   │   └── workers/                                                                                                                                                                              
  │   │   │   │       ├── email.worker.ts                                                                                                                                                                   
  │   │   │   │       └── analysis.worker.ts
  │   │   │   ├── email.service.ts                                                                                                                                                                          
  │   │   │   └── notification.service.ts   ← Telegram + future channels                                                                                                                                    
  │   │   ├── repositories/                                                                                                                                                                                 
  │   │   │   ├── user.repository.ts                                                                                                                                                                        
  │   │   │   ├── resume.repository.ts                                                                                                                                                                      
  │   │   │   └── analysis.repository.ts                                                                                                                                                                    
  │   │   ├── middleware/
  │   │   │   ├── auth.middleware.ts                                                                                                                                                                        
  │   │   │   ├── rateLimit.middleware.ts                   
  │   │   │   ├── validate.middleware.ts    ← Zod schema validation                                                                                                                                         
  │   │   │   ├── errorHandler.middleware.ts
  │   │   │   └── requestLogger.middleware.ts                                                                                                                                                               
  │   │   ├── config/                                       
  │   │   │   ├── env.ts                   ← Zod-validated env                                                                                                                                              
  │   │   │   ├── database.ts              ← Prisma client                                                                                                                                                  
  │   │   │   ├── redis.ts                 ← ioredis client
  │   │   │   └── keywords/                                                                                                                                                                                 
  │   │   │       └── *.json               ← per-domain keyword files
  │   │   ├── lib/                                                                                                                                                                                          
  │   │   │   ├── logger.ts                ← Winston structured logger
  │   │   │   └── errors.ts                ← custom error classes                                                                                                                                           
  │   │   ├── types/                                                                                                                                                                                        
  │   │   │   └── index.ts                                                                                                                                                                                  
  │   │   └── server.ts                                                                                                                                                                                     
  │   ├── prisma/                                           
  │   │   ├── schema.prisma
  │   │   └── migrations/                                                                                                                                                                                   
  │   ├── tests/
  │   │   ├── unit/                                                                                                                                                                                         
  │   │   └── integration/                                  
  │   ├── Dockerfile
  │   ├── .env.example                                                                                                                                                                                      
  │   └── tsconfig.json
  │                                                                                                                                                                                                         
  ├── frontend/                          ← Next.js 15 + TypeScript
  │   ├── src/                                                                                                                                                                                              
  │   │   ├── app/
  │   │   │   ├── (marketing)/            ← route group                                                                                                                                                     
  │   │   │   │   └── page.tsx            ← landing page                                                                                                                                                    
  │   │   │   ├── (auth)/
  │   │   │   │   ├── login/page.tsx                                                                                                                                                                        
  │   │   │   │   └── register/page.tsx                     
  │   │   │   ├── dashboard/                                                                                                                                                                                
  │   │   │   │   ├── page.tsx            ← user dashboard                                                                                                                                                  
  │   │   │   │   ├── history/page.tsx    ← analysis history
  │   │   │   │   └── resume/[id]/page.tsx                                                                                                                                                                  
  │   │   │   └── api/                                      
  │   │   │       └── auth/[...nextauth]/  ← Auth.js                                                                                                                                                        
  │   │   ├── components/                                                                                                                                                                                   
  │   │   │   ├── upload/
  │   │   │   │   ├── UploadWizard.tsx                                                                                                                                                                      
  │   │   │   │   ├── DomainStep.tsx                        
  │   │   │   │   ├── DetailsStep.tsx                                                                                                                                                                       
  │   │   │   │   └── FileStep.tsx                          
  │   │   │   ├── results/                                                                                                                                                                                  
  │   │   │   │   ├── ScoreDashboard.tsx                    
  │   │   │   │   ├── RadialGauge.tsx                                                                                                                                                                       
  │   │   │   │   ├── KeywordGapAnalysis.tsx                                                                                                                                                                
  │   │   │   │   └── SuggestionCard.tsx
  │   │   │   ├── dashboard/                                                                                                                                                                                
  │   │   │   │   ├── AnalysisHistory.tsx                   
  │   │   │   │   ├── ScoreTrendChart.tsx                                                                                                                                                                   
  │   │   │   │   └── ResumeVersionCard.tsx                 
  │   │   │   └── ui/                     ← shadcn/ui components                                                                                                                                            
  │   │   ├── hooks/                                        
  │   │   │   ├── useAnalysis.ts                                                                                                                                                                            
  │   │   │   ├── useResumeHistory.ts                       
  │   │   │   └── useRealtimeProgress.ts  ← SSE hook                                                                                                                                                        
  │   │   ├── lib/                                                                                                                                                                                          
  │   │   │   ├── api.ts                  ← typed API client
  │   │   │   └── auth.ts                                                                                                                                                                                   
  │   │   └── stores/                                                                                                                                                                                       
  │   │       └── analysisStore.ts        ← Zustand
  │   └── ...                                                                                                                                                                                               
  │                                                         
  ├── docker-compose.yml                 ← postgres + redis + backend + frontend                                                                                                                            
  ├── .github/                                                                                                                                                                                              
  │   └── workflows/
  │       ├── ci.yml                                                                                                                                                                                        
  │       └── deploy.yml                                    
  └── README.md
                                                                                                                                                                                                            
  ---
  Section 3: Features by Priority                                                                                                                                                                           
                                                            
  ---
  🔴 HIGH IMPACT — Phase 1 (Weeks 1–2)

  ---
  1. PostgreSQL + Prisma ORM

  Why it matters for recruiters: A stateless app that throws away every analysis is a toy, not a product. Persistence enables user history, analytics, A/B testing, and everything meaningful.

  Tech: prisma, @prisma/client, PostgreSQL 16

  Schema:

  // prisma/schema.prisma

  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }                                                                                                                                                                                                         
   
  model User {                                                                                                                                                                                              
    id           String     @id @default(cuid())            
    email        String     @unique
    name         String?
    passwordHash String?
    provider     String     @default("email")  // email | google | github                                                                                                                                   
    createdAt    DateTime   @default(now())
    updatedAt    DateTime   @updatedAt                                                                                                                                                                      
    analyses     Analysis[]                                                                                                                                                                                 
    resumes      Resume[]
  }                                                                                                                                                                                                         
                                                            
  model Resume {
    id           String     @id @default(cuid())
    userId       String?                                                                                                                                                                                    
    originalName String
    mimeType     String                                                                                                                                                                                     
    sizeBytes    Int                                        
    storagePath  String?    // S3/R2 key if using object storage
    extractedText String?   @db.Text                                                                                                                                                                        
    createdAt    DateTime   @default(now())                                                                                                                                                                 
    analyses     Analysis[]                                                                                                                                                                                 
    user         User?      @relation(fields: [userId], references: [id])                                                                                                                                   
  }                                                         

  model Analysis {                                                                                                                                                                                          
    id             String   @id @default(cuid())
    userId         String?                                                                                                                                                                                  
    resumeId       String                                   
    mode           String   // analyze | rewrite
    domain         String
    score          Int?                                                                                                                                                                                     
    keywordsMatched String[] // PostgreSQL array
    keywordsMissed String[]                                                                                                                                                                                 
    suggestions    String[]                                                                                                                                                                                 
    rewrittenText  String?  @db.Text
    jobDescription String?  @db.Text                                                                                                                                                                        
    emailSent      Boolean  @default(false)                 
    processingMs   Int?     // track performance                                                                                                                                                            
    createdAt      DateTime @default(now())                                                                                                                                                                 
    user           User?    @relation(fields: [userId], references: [id])
    resume         Resume   @relation(fields: [resumeId], references: [id])                                                                                                                                 
                                                                                                                                                                                                            
    @@index([userId])
    @@index([domain])                                                                                                                                                                                       
    @@index([createdAt])                                    
  }

  Recruiter impact: Shows you understand data modeling, indexing strategy, and relational design — not just CRUD tutorials.                                                                                 
   
  ---                                                                                                                                                                                                       
  2. BullMQ + Redis Job Queue                               
                                                                                                                                                                                                            
  Why it matters: Right now handleUpload blocks the HTTP response for up to 30 seconds while Gemini processes. This is production-fatal — one slow request blocks the Node.js event loop path, and users get
   timeout errors. A job queue decouples processing from response.                                                                                                                                          
                                                            
  Tech: bullmq, ioredis                                                                                                                                                                                     
                                                            
  Architecture:                                                                                                                                                                                             
                                                            
  // src/services/queue/queue.service.ts
  import { Queue, Worker, QueueEvents } from 'bullmq';
  import { redis } from '../../config/redis';                                                                                                                                                               
   
  export const analysisQueue = new Queue('resume-analysis', {                                                                                                                                               
    connection: redis,                                      
    defaultJobOptions: {                                                                                                                                                                                    
      attempts: 3,                                          
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,                                                                                                                                                                                    
    },
  });                                                                                                                                                                                                       
                                                            
  // Controller: immediately returns a jobId                                                                                                                                                                
  export const enqueueAnalysis = async (payload: AnalysisJobPayload) => {
    const job = await analysisQueue.add('analyze', payload, {                                                                                                                                               
      priority: payload.mode === 'rewrite' ? 1 : 2,                                                                                                                                                         
    });                                                                                                                                                                                                     
    return job.id;                                                                                                                                                                                          
  };                                                                                                                                                                                                        
                                                            
  // src/services/queue/workers/analysis.worker.ts
  const worker = new Worker('resume-analysis', async (job) => {
    const { resumeBuffer, mode, domain, jobDescription, userId } = job.data;                                                                                                                                
                                                                                                                                                                                                            
    await job.updateProgress(10);                                                                                                                                                                           
    const text = await parserService.extract(resumeBuffer);                                                                                                                                                 
                                                                                                                                                                                                            
    await job.updateProgress(30);
    const result = mode === 'rewrite'                                                                                                                                                                       
      ? await rewriterService.rewrite(text, jobDescription)                                                                                                                                                 
      : await analyzerService.analyze(text, domain);
                                                                                                                                                                                                            
    await job.updateProgress(80);                                                                                                                                                                           
    await emailService.send(result);
                                                                                                                                                                                                            
    await job.updateProgress(100);                          
    return result;
  }, { connection: redis, concurrency: 5 });
                                                                                                                                                                                                            
  Frontend: Poll /api/v1/jobs/:jobId/status or use SSE (see feature 6) for real-time progress.                                                                                                              
                                                                                                                                                                                                            
  Recruiter impact: Demonstrates understanding of async processing, worker concurrency, retry logic, and backpressure — patterns used at every serious backend.                                             
                                                            
  ---                                                                                                                                                                                                       
  3. Zod Environment Validation                             
                                                                                                                                                                                                            
  Why it matters: Silent misconfiguration is a production killer. Your app currently starts fine with a missing GEMINI_API_KEY and crashes only when a user triggers the AI path.
                                                                                                                                                                                                            
  Tech: zod                                                 
                                                                                                                                                                                                            
  // src/config/env.ts                                      
  import { z } from 'zod';

  const envSchema = z.object({
    NODE_ENV:               z.enum(['development', 'production', 'test']),
    PORT:                   z.coerce.number().default(5000),                                                                                                                                                
    DATABASE_URL:           z.string().url(),
    REDIS_URL:              z.string().url(),                                                                                                                                                               
    GEMINI_API_KEY:         z.string().min(1),              
    SMTP_HOST:              z.string(),                                                                                                                                                                     
    SMTP_PORT:              z.coerce.number().default(587),                                                                                                                                                 
    SMTP_USER:              z.string().email(),
    SMTP_PASS:              z.string().min(1),                                                                                                                                                              
    JWT_SECRET:             z.string().min(32),                                                                                                                                                             
    TELEGRAM_BOT_TOKEN:     z.string().optional(),
    TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),                                                                                                                                                          
    FRONTEND_URL:           z.string().url().default('http://localhost:3000'),                                                                                                                              
    MAX_FILE_SIZE_MB:       z.coerce.number().default(5),
  });                                                                                                                                                                                                       
                                                            
  export const env = envSchema.parse(process.env); // throws on startup if invalid                                                                                                                          
                                                            
  Recruiter impact: Shows you write defensive, fail-fast code — the kind senior engineers write.                                                                                                            
                                                            
  ---                                                                                                                                                                                                       
  4. Structured Error Handling + Winston Logging            
                                                
  Why it matters: console.error is not logging. Real apps need structured JSON logs, log levels, request correlation IDs, and log shipping to a service (Datadog, Logtail, etc.).
                                                                                                                                                                                                            
  Tech: winston, express-async-errors, uuid                                                                                                                                                                 
                                                                                                                                                                                                            
  // src/lib/logger.ts                                                                                                                                                                                      
  import winston from 'winston';                            

  export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(                                                                                                                                                                         
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),                                                                                                                                                               
      winston.format.json(),                                
    ),                                                                                                                                                                                                      
    transports: [
      new winston.transports.Console({                                                                                                                                                                      
        format: process.env.NODE_ENV === 'development'      
          ? winston.format.prettyPrint()
          : winston.format.json(),                                                                                                                                                                          
      }),
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),                                                                                                                          
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ],                                                                                                                                                                                                      
  });
                                                                                                                                                                                                            
  // src/lib/errors.ts                                      
  export class AppError extends Error {
    constructor(                                                                                                                                                                                            
      public message: string,
      public statusCode: number = 500,                                                                                                                                                                      
      public code: string = 'INTERNAL_ERROR',               
    ) {
      super(message);                                                                                                                                                                                       
      this.name = 'AppError';
    }                                                                                                                                                                                                       
  }                                                         

  export class ValidationError extends AppError {
    constructor(message: string) { super(message, 400, 'VALIDATION_ERROR'); }
  }                                                                                                                                                                                                         
   
  export class RateLimitError extends AppError {                                                                                                                                                            
    constructor() { super('Too many requests', 429, 'RATE_LIMIT_EXCEEDED'); }
  }

  // src/middleware/errorHandler.middleware.ts
  import { logger } from '../lib/logger';                                                                                                                                                                   
  import { AppError } from '../lib/errors';
                                                                                                                                                                                                            
  export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {                                                                                                                               
    const requestId = req.headers['x-request-id'] as string;
                                                                                                                                                                                                            
    logger.error({                                                                                                                                                                                          
      message: err.message,
      stack: err.stack,                                                                                                                                                                                     
      requestId,                                            
      path: req.path,
      method: req.method,
    });                                                                                                                                                                                                     
   
    if (err instanceof AppError) {                                                                                                                                                                          
      return res.status(err.statusCode).json({              
        success: false,
        error: { code: err.code, message: err.message },
        requestId,
      });                                                                                                                                                                                                   
    }
                                                                                                                                                                                                            
    res.status(500).json({                                  
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      requestId,                                                                                                                                                                                            
    });
  };                                                                                                                                                                                                        
                                                            
  ---
  5. Rate Limiting + Security Hardening
                                       
  Why it matters: Your API is fully open — anyone can hit /api/upload 10,000 times and rack up Gemini API bills, spam emails, or DoS the server.
                                                                                                                                                                                                            
  Tech: express-rate-limit, rate-limit-redis, helmet, express-mongo-sanitize                                                                                                                                
                                                                                                                                                                                                            
  // src/middleware/rateLimit.middleware.ts                                                                                                                                                                 
  import rateLimit from 'express-rate-limit';               
  import RedisStore from 'rate-limit-redis';                                                                                                                                                                
  import { redis } from '../config/redis';
                                                                                                                                                                                                            
  export const apiLimiter = rateLimit({                                                                                                                                                                     
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100,                                                                                                                                                                                               
    standardHeaders: true,                                  
    legacyHeaders: false,
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),                                                                                                                               
  });                                                                                                                                                                                                       
                                                                                                                                                                                                            
  export const uploadLimiter = rateLimit({                                                                                                                                                                  
    windowMs: 60 * 60 * 1000,   // 1 hour                   
    max: 10,                     // max 10 analyses per hour per IP
    message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Max 10 analyses per hour' } },                                                                                                               
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),                                                                                                                               
  });                                                                                                                                                                                                       
                                                                                                                                                                                                            
  // server.ts                                              
  app.use(helmet());              // sets 11 security headers                                                                                                                                               
  app.use(compression());         // gzip all responses     
  app.use(cors({                                                                                                                                                                                            
    origin: env.FRONTEND_URL,
    credentials: true,                                                                                                                                                                                      
    methods: ['GET', 'POST'],                               
  }));                                                                                                                                                                                                      
  app.use('/api/v1/resume', uploadLimiter);
  app.use('/api', apiLimiter);                                                                                                                                                                              
                                                            
  ---                                                                                                                                                                                                       
  6. Server-Sent Events for Real-Time Progress
                                                                                                                                                                                                            
  Why it matters: Users staring at a spinner for 20–30 seconds (Gemini rewrite) is terrible UX. SSE pushes live progress updates — "Extracting text… Analysing keywords… Rewriting with AI… Sending email…"
  — for near-zero cost (no WebSocket infrastructure).                                                                                                                                                       
   
  Backend:                                                                                                                                                                                                  
                                                            
  // src/api/v1/routes/analysis.routes.ts                                                                                                                                                                   
  router.get('/jobs/:jobId/stream', authMiddleware.optional, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');                                                                                                                                                     
    res.setHeader('Cache-Control', 'no-cache');                                                                                                                                                             
    res.setHeader('Connection', 'keep-alive');                                                                                                                                                              
    res.flushHeaders();                                                                                                                                                                                     
                                                            
    const queueEvents = new QueueEvents('resume-analysis', { connection: redis });                                                                                                                          
   
    const send = (event: string, data: object) => {                                                                                                                                                         
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };                                                                                                                                                                                                      
                                                            
    queueEvents.on('progress', ({ jobId, data }) => {                                                                                                                                                       
      if (jobId === req.params.jobId) send('progress', data);
    });                                                                                                                                                                                                     
                                                                                                                                                                                                            
    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      if (jobId === req.params.jobId) {                                                                                                                                                                     
        send('completed', returnvalue);                                                                                                                                                                     
        res.end();
      }                                                                                                                                                                                                     
    });                                                     

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      if (jobId === req.params.jobId) {
        send('error', { message: failedReason });                                                                                                                                                           
        res.end();
      }                                                                                                                                                                                                     
    });                                                     

    req.on('close', () => queueEvents.close());                                                                                                                                                             
  });
                                                                                                                                                                                                            
  Frontend hook:                                            

  // src/hooks/useRealtimeProgress.ts
  export const useRealtimeProgress = (jobId: string | null) => {
    const [progress, setProgress] = useState<ProgressState | null>(null);                                                                                                                                   
  
    useEffect(() => {                                                                                                                                                                                       
      if (!jobId) return;                                   
      const es = new EventSource(`/api/v1/jobs/${jobId}/stream`);                                                                                                                                           
      es.addEventListener('progress', e => setProgress(JSON.parse(e.data)));
      es.addEventListener('completed', e => { setProgress(JSON.parse(e.data)); es.close(); });                                                                                                              
      es.addEventListener('error', () => es.close());       
      return () => es.close();                                                                                                                                                                              
    }, [jobId]);                                            
                                                                                                                                                                                                            
    return progress;                                        
  };

  Recruiter impact: Real-time features, event-driven architecture, SSE vs WebSocket trade-off knowledge — these are senior-level signals.                                                                   
   
  ---                                                                                                                                                                                                       
  🟡 MEDIUM IMPACT — Phase 2 (Weeks 3–4)                    
                                                                                                                                                                                                            
  ---
  7. Authentication with Auth.js (NextAuth v5)                                                                                                                                                              
                                                                                                                                                                                                            
  Why it matters: Without auth, every analysis is anonymous and disposable. Auth enables user dashboards, history, personalization — the entire SaaS value proposition.
                                                                                                                                                                                                            
  Tech: next-auth (v5 / Auth.js), Google OAuth + email magic link                                                                                                                                           
                                                                                                                                                                                                            
  // src/app/api/auth/[...nextauth]/route.ts                                                                                                                                                                
  import NextAuth from 'next-auth';                                                                                                                                                                         
  import Google from 'next-auth/providers/google';
  import Resend from 'next-auth/providers/resend';                                                                                                                                                          
  import { PrismaAdapter } from '@auth/prisma-adapter';                                                                                                                                                     
  import { prisma } from '@/lib/prisma';
                                                                                                                                                                                                            
  export const { handlers, auth, signIn, signOut } = NextAuth({                                                                                                                                             
    adapter: PrismaAdapter(prisma),
    providers: [                                                                                                                                                                                            
      Google({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }),
      Resend({ apiKey: env.RESEND_API_KEY, from: 'auth@ats-analyzer.com' }),                                                                                                                                
    ],
    callbacks: {                                                                                                                                                                                            
      session: ({ session, user }) => ({                                                                                                                                                                    
        ...session,
        user: { ...session.user, id: user.id },                                                                                                                                                             
      }),                                                   
    },
  });                                                                                                                                                                                                       
  
  Backend JWT middleware for API routes:                                                                                                                                                                    
                                                            
  // src/middleware/auth.middleware.ts
  import jwt from 'jsonwebtoken';                                                                                                                                                                           
  
  export const authMiddleware = {                                                                                                                                                                           
    required: (req, res, next) => {                         
      const token = req.cookies['next-auth.session-token']
        || req.headers.authorization?.replace('Bearer ', '');                                                                                                                                               
      if (!token) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      // verify and attach user                                                                                                                                                                             
      next();                                               
    },                                                                                                                                                                                                      
    optional: (req, res, next) => {                         
      // attach user if token present, continue either way                                                                                                                                                  
      next();                                                                                                                                                                                               
    },
  };                                                                                                                                                                                                        
                                                            
  ---
  8. Enhanced ATS Scoring Engine
                                
  Why it matters: Your current scoring is keyword count / 15 * 70. That is not ATS analysis — that's ctrl+F. Real ATS engines (Workday, Greenhouse, Lever) use TF-IDF, semantic similarity, section parsing,
   and formatting analysis.                                                                                                                                                                                 
   
  Improvements:                                                                                                                                                                                             
                                                            
  // src/services/resume/analyzer.service.ts
                                                                                                                                                                                                            
  interface AnalysisResult {
    score: number;                                                                                                                                                                                          
    breakdown: {                                            
      keywordScore: number;       // 0-40: exact + semantic keyword match
      achievementScore: number;   // 0-25: quantified results detection                                                                                                                                     
      formattingScore: number;    // 0-20: ATS-friendly structure                                                                                                                                           
      readabilityScore: number;   // 0-15: sentence complexity, bullet length                                                                                                                               
    };                                                                                                                                                                                                      
    matchedKeywords: string[];                                                                                                                                                                              
    missingKeywords: string[];    // NEW: tell users exactly what's missing                                                                                                                                 
    keywordDensity: number;       // keyword density percentage                                                                                                                                             
    sectionDetected: {            // NEW: section presence                                                                                                                                                  
      summary: boolean;                                                                                                                                                                                     
      experience: boolean;                                                                                                                                                                                  
      education: boolean;                                                                                                                                                                                   
      skills: boolean;                                      
      projects: boolean;
    };
    warnings: string[];           // NEW: specific ATS failure reasons
    suggestions: string[];                                                                                                                                                                                  
  }
                                                                                                                                                                                                            
  // Semantic keyword matching using embedding similarity:                                                                                                                                                  
  const semanticMatch = async (resumeText: string, keywords: string[]) => {
    // Use Gemini embeddings API to find semantically similar terms                                                                                                                                         
    // e.g., "Node.js" matches "server-side JavaScript", "backend JS"                                                                                                                                       
    const embeddings = await gemini.embedContent(resumeText);                                                                                                                                               
    // cosine similarity matching                                                                                                                                                                           
  };                                                                                                                                                                                                        
                                                            
  // ATS formatting checks:                                                                                                                                                                                 
  const formattingChecks = (text: string): string[] => {    
    const warnings = [];
    if (/[│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌]/u.test(text))                                                                                                                                           
      warnings.push('Tables detected — ATS cannot parse table content');                                                                                                                                    
    if (text.length < 400)                                                                                                                                                                                  
      warnings.push('Resume appears too short — add more detail');                                                                                                                                          
    if (!/\b(19|20)\d{2}\b/.test(text))                                                                                                                                                                     
      warnings.push('No dates detected — add employment date ranges');                                                                                                                                      
    if (!/\b\d+[%x]\b|\$[\d,]+|\d+\+\s*(years?|clients?|projects?)/i.test(text))                                                                                                                            
      warnings.push('No quantified achievements — add metrics (%, $, numbers)');                                                                                                                            
    if ((text.match(/\b(responsible for|duties included|worked on)\b/gi) || []).length > 2)                                                                                                                 
      warnings.push('Weak phrasing detected — replace with action verbs');                                                                                                                                  
    return warnings;                                                                                                                                                                                        
  };                                                                                                                                                                                                        
                                                                                                                                                                                                            
  Add more domains: Expand keywords.json to 25+ domains with 50+ keywords each, covering: Data Engineering, Mobile (iOS/Android), Cloud Architecture, Product Management, UI/UX Design, Blockchain, ML      
  Engineering, SRE, etc.
                                                                                                                                                                                                            
  ---                                                       
  9. AI-Powered Keyword Gap Analysis
                                    
  Why it matters: "You scored 65%" is useless. "You're missing 8 keywords the JD requires: Kubernetes, Terraform, SLO/SLI, incident management — here's how to add them" is actionable gold.
                                                                                                                                                                                                            
  Implementation:
                                                                                                                                                                                                            
  // src/services/ai/prompts/keyword-gap.ts                 
  export const keywordGapPrompt = (resumeText: string, jd: string) => `                                                                                                                                     
  You are an ATS expert. Compare the resume against the job description.                                                                                                                                    
                                                                                                                                                                                                            
  Return ONLY valid JSON matching this schema:                                                                                                                                                              
  {                                                                                                                                                                                                         
    "criticalMissing": ["keyword that appears 3+ times in JD but not in resume"],
    "nicetohaveMissing": ["keyword appears once in JD, not in resume"],                                                                                                                                     
    "presentKeywords": ["keywords found in both"],                                                                                                                                                          
    "keywordDensityIssues": ["keywords present but underutilized"],                                                                                                                                         
    "overusedPhrases": ["clichés that weaken the resume"],                                                                                                                                                  
    "recommendedAdditions": [                                                                                                                                                                               
      { "keyword": "...", "where": "Skills section", "example": "Managed Kubernetes clusters across 3 environments" }                                                                                       
    ]                                                                                                                                                                                                       
  }                                                                                                                                                                                                         
                                                                                                                                                                                                            
  RESUME: ${resumeText}                                     
  JOB DESCRIPTION: ${jd}
  `;

  Gemini with structured output (JSON mode):                                                                                                                                                                
   
  const result = await model.generateContent({                                                                                                                                                              
    contents: [{ role: 'user', parts: [{ text: prompt }] }],                                                                                                                                                
    generationConfig: {
      responseMimeType: 'application/json',  // Gemini 1.5 structured output                                                                                                                                
      responseSchema: KeywordGapSchema,       // Zod schema → JSON Schema                                                                                                                                   
    },                                                                                                                                                                                                      
  });                                                                                                                                                                                                       
                                                                                                                                                                                                            
  ---                                                       
  10. User Dashboard with Analysis History
                                          
  Why it matters: The entire point of a SaaS is that users come back. A dashboard showing score trends over time is the #1 retention feature.
                                                                                                                                                                                                            
  // src/app/dashboard/page.tsx — key data points:
  // - Score trend chart (Recharts/Victory) across all analyses                                                                                                                                             
  // - Last 5 resume versions side-by-side score comparison                                                                                                                                                 
  // - Keyword gap heatmap: which skills appear most across all their JDs                                                                                                                                   
  // - Domain distribution: what roles they're applying for                                                                                                                                                 
  // - "Your best performing resume" highlight                                                                                                                                                              
                                                                                                                                                                                                            
  API endpoint:                                                                                                                                                                                             
                                                                                                                                                                                                            
  // GET /api/v1/users/:id/analytics                        
  {                                                                                                                                                                                                         
    "totalAnalyses": 12,
    "avgScore": 67,                                                                                                                                                                                         
    "scoreImprovement": +15,        // since first analysis                                                                                                                                                 
    "topMissingKeywords": ["Kubernetes", "Terraform", "gRPC"],
    "scoreOverTime": [                                                                                                                                                                                      
      { "date": "2026-05-01", "score": 52, "domain": "DevOps" },
      { "date": "2026-05-07", "score": 67, "domain": "DevOps" }                                                                                                                                             
    ],                                                                                                                                                                                                      
    "bestScore": { "score": 84, "analysisId": "..." }                                                                                                                                                       
  }                                                                                                                                                                                                         
                                                            
  ---                                                                                                                                                                                                       
  11. Resume Versioning + Side-by-Side Comparison           
                                                                                                                                                                                                            
  Why it matters: Users iterate on their resumes. Showing "Version 3 scored 12 points higher than Version 1 because you added these 4 keywords" is a killer feature no free competitor has.
                                                                                                                                                                                                            
  // GET /api/v1/resumes/:id/versions                       
  // GET /api/v1/analyses/compare?ids=id1,id2                                                                                                                                                               
                                                                                                                                                                                                            
  // Frontend: side-by-side diff viewer                                                                                                                                                                     
  // Use diff-match-patch or react-diff-viewer to show exactly what changed                                                                                                                                 
  // Overlay score delta: "Adding 'TypeScript' and 'REST API' added +8 points"                                                                                                                              
                                                                                                                                                                                                            
  ---                                                                                                                                                                                                       
  12. PDF Export of Rewritten Resume                                                                                                                                                                        
                                                            
  Why it matters: Right now the rewritten resume arrives by email as a plain <pre> block. Users need a download-ready, beautifully formatted PDF.
                                                                                                                                                                                                            
  Tech: @react-pdf/renderer (frontend) or puppeteer (backend)                                                                                                                                               
                                                                                                                                                                                                            
  // src/services/resume/pdfExport.service.ts                                                                                                                                                               
  import puppeteer from 'puppeteer';                        

  export const generateResumePDF = async (rewrittenText: string, userName: string) => {                                                                                                                     
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();                                                                                                                                                                   
                                                                                                                                                                                                            
    // Render a clean HTML template
    await page.setContent(buildResumeHTML(rewrittenText, userName));                                                                                                                                        
                                                                                                                                                                                                            
    const pdf = await page.pdf({
      format: 'A4',                                                                                                                                                                                         
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,                                                                                                                                                                                
    });
                                                                                                                                                                                                            
    await browser.close();                                  
    return pdf; // Buffer — can be returned as download or attached to email
  };                                                                                                                                                                                                        
   
  ---                                                                                                                                                                                                       
  13. AI Chat Assistant (Context-Aware Resume Q&A)          
                                                                                                                                                                                                            
  Why it matters: This is a 2026 differentiator. "Ask AI" about any part of the resume in a chat interface: "How do I improve my skills section for a DevOps role?" — the AI has full context of their
  resume and the JD.                                                                                                                                                                                        
                                                            
  Tech: Gemini chat API (startChat) + Zustand chat store + streaming                                                                                                                                        
                                                            
  // src/services/ai/gemini.service.ts                                                                                                                                                                      
  export const startResumeChat = async (resumeText: string, analysisResult: AnalysisResult) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });                                                                                                                                  
                                                                                                                                                                                                            
    const systemContext = `You are an expert resume coach. You have access to the candidate's resume                                                                                                        
  and their ATS analysis results. Help them improve their resume specifically.                                                                                                                              
                                                                                                                                                                                                            
  RESUME: ${resumeText}                                     
  ATS SCORE: ${analysisResult.score}/100                                                                                                                                                                    
  MISSING KEYWORDS: ${analysisResult.missingKeywords.join(', ')}                                                                                                                                            
  DOMAIN: ${analysisResult.domain}
                                                                                                                                                                                                            
  Answer questions specifically about THIS resume. Give concrete, actionable advice.`;
                                                                                                                                                                                                            
    return model.startChat({                                                                                                                                                                                
      history: [{ role: 'user', parts: [{ text: systemContext }] }],                                                                                                                                        
      generationConfig: { maxOutputTokens: 1000 },                                                                                                                                                          
    });                                                                                                                                                                                                     
  };
                                                                                                                                                                                                            
  // Stream the response token by token                     
  const stream = await chat.sendMessageStream(userMessage);
  for await (const chunk of stream) {                                                                                                                                                                       
    res.write(chunk.text());
  }                                                                                                                                                                                                         
                                                            
  ---
  🟢 OPTIONAL — Phase 3–4 (Production Polish)

  ---
  14. Docker + Docker Compose

  Tech: Multi-stage Dockerfile for lean production images

  # backend/Dockerfile
  FROM node:20-alpine AS base
  WORKDIR /app

  FROM base AS deps
  COPY package*.json ./
  RUN npm ci --only=production

  FROM base AS builder
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  FROM base AS runner
  ENV NODE_ENV=production
  COPY --from=deps /app/node_modules ./node_modules
  COPY --from=builder /app/dist ./dist
  COPY prisma ./prisma                                                                                                                                                                                      
  EXPOSE 5000
  CMD ["node", "dist/server.js"]                                                                                                                                                                            
                                                            
  # docker-compose.yml                                                                                                                                                                                      
  version: '3.9'
                                                                                                                                                                                                            
  services:                                                 
    postgres:
      image: postgres:16-alpine
      environment:
        POSTGRES_DB: ats_analyzer
        POSTGRES_USER: ${DB_USER}
        POSTGRES_PASSWORD: ${DB_PASSWORD}                                                                                                                                                                   
      volumes:
        - postgres_data:/var/lib/postgresql/data                                                                                                                                                            
      healthcheck:                                          
        test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]                                                                                                                                                     
        interval: 5s
                                                                                                                                                                                                            
    redis:                                                  
      image: redis:7-alpine
      command: redis-server --requirepass ${REDIS_PASSWORD}
      volumes:                                                                                                                                                                                              
        - redis_data:/data
                                                                                                                                                                                                            
    backend:                                                
      build: ./backend
      depends_on:
        postgres: { condition: service_healthy }
        redis:    { condition: service_started }                                                                                                                                                            
      environment:
        DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/ats_analyzer                                                                                                                     
        REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379                                                                                                                                                    
      ports: ["5000:5000"]
                                                                                                                                                                                                            
    frontend:                                               
      build: ./frontend
      environment:                                                                                                                                                                                          
        NEXT_PUBLIC_API_URL: http://backend:5000
      ports: ["3000:3000"]                                                                                                                                                                                  
                                                            
  volumes:
    postgres_data:
    redis_data:                                                                                                                                                                                             
   
  ---                                                                                                                                                                                                       
  15. GitHub Actions CI/CD                                  

  # .github/workflows/ci.yml
  name: CI
  on: [push, pull_request]                                                                                                                                                                                  
   
  jobs:                                                                                                                                                                                                     
    backend:                                                
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:16
          env: { POSTGRES_PASSWORD: test, POSTGRES_DB: ats_test }
          options: --health-cmd pg_isready                                                                                                                                                                  
        redis:                                                                                                                                                                                              
          image: redis:7                                                                                                                                                                                    
          options: --health-cmd "redis-cli ping"                                                                                                                                                            
      steps:                                                
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4                                                                                                                                                                       
          with: { node-version: '20', cache: 'npm' }
        - run: npm ci                                                                                                                                                                                       
          working-directory: backend                        
        - run: npm run typecheck                                                                                                                                                                            
          working-directory: backend
        - run: npm run lint                                                                                                                                                                                 
          working-directory: backend                        
        - run: npx prisma migrate deploy
          working-directory: backend                                                                                                                                                                        
          env: { DATABASE_URL: postgresql://postgres:test@localhost:5432/ats_test }
        - run: npm test                                                                                                                                                                                     
          working-directory: backend                                                                                                                                                                        
   
    frontend:                                                                                                                                                                                               
      runs-on: ubuntu-latest                                
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20', cache: 'npm' }
        - run: npm ci && npm run build                                                                                                                                                                      
          working-directory: frontend
                                                                                                                                                                                                            
  ---                                                       
  16. Request Tracing + Sentry Error Monitoring
                                                                                                                                                                                                            
  // src/middleware/requestLogger.middleware.ts
  import { v4 as uuid } from 'uuid';                                                                                                                                                                        
  import { logger } from '../lib/logger';                   
                                                                                                                                                                                                            
  export const requestLogger = (req, res, next) => {                                                                                                                                                        
    req.id = uuid();
    res.setHeader('X-Request-Id', req.id);                                                                                                                                                                  
                                                            
    const start = Date.now();                                                                                                                                                                               
    res.on('finish', () => {
      logger.info({                                                                                                                                                                                         
        requestId: req.id,                                  
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,                                                                                                                                                                         
        durationMs: Date.now() - start,
        ip: req.ip,                                                                                                                                                                                         
        userAgent: req.headers['user-agent'],               
      });
    });                                                                                                                                                                                                     
    next();
  };                                                                                                                                                                                                        
                                                            
  // Sentry integration:
  import * as Sentry from '@sentry/node';
  Sentry.init({ dsn: env.SENTRY_DSN, tracesSampleRate: 0.1 });                                                                                                                                              
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler()); // before your custom errorHandler                                                                                                                               
                                                                                                                                                                                                            
  ---                                                                                                                                                                                                       
  17. Frontend: Zustand State + Typed API Client                                                                                                                                                            
                                                                                                                                                                                                            
  // src/lib/api.ts — typed, centralized API client
  import ky from 'ky';                                                                                                                                                                                      
                                                                                                                                                                                                            
  const api = ky.create({
    prefixUrl: process.env.NEXT_PUBLIC_API_URL,                                                                                                                                                             
    credentials: 'include',                                 
    hooks: {                                                                                                                                                                                                
      beforeRequest: [
        request => {                                                                                                                                                                                        
          // attach auth token from cookie session automatically
        }                                                                                                                                                                                                   
      ],
      afterResponse: [                                                                                                                                                                                      
        async (request, options, response) => {             
          if (!response.ok) {                                                                                                                                                                               
            const error = await response.json();
            throw new ApiError(error.error.message, response.status);                                                                                                                                       
          }                                                 
        }                                                                                                                                                                                                   
      ],                                                    
    },
  });

  export const resumeApi = {                                                                                                                                                                                
    upload: (formData: FormData) =>
      api.post('api/v1/resume/upload', { body: formData }).json<UploadResponse>(),                                                                                                                          
                                                                                                                                                                                                            
    getJobStatus: (jobId: string) =>
      api.get(`api/v1/jobs/${jobId}`).json<JobStatus>(),                                                                                                                                                    
                                                                                                                                                                                                            
    getAnalysisHistory: () =>
      api.get('api/v1/analyses').json<Analysis[]>(),                                                                                                                                                        
                                                            
    compareAnalyses: (ids: string[]) =>                                                                                                                                                                     
      api.get('api/v1/analyses/compare', { searchParams: { ids } }).json<ComparisonResult>(),
  };                                                                                                                                                                                                        
                                                            
  // src/stores/analysisStore.ts                                                                                                                                                                            
  import { create } from 'zustand';                         
  import { devtools, persist } from 'zustand/middleware';

  interface AnalysisStore {
    currentJobId: string | null;
    currentAnalysis: Analysis | null;                                                                                                                                                                       
    history: Analysis[];
    mode: 'analyze' | 'rewrite';                                                                                                                                                                            
    setMode: (m: 'analyze' | 'rewrite') => void;            
    setJobId: (id: string) => void;                                                                                                                                                                         
    setAnalysis: (a: Analysis) => void;
    reset: () => void;                                                                                                                                                                                      
  }                                                         
                                                                                                                                                                                                            
  export const useAnalysisStore = create<AnalysisStore>()(
    devtools(                                                                                                                                                                                               
      persist(                                              
        (set) => ({
          currentJobId: null,
          currentAnalysis: null,
          history: [],
          mode: 'analyze',                                                                                                                                                                                  
          setMode: (mode) => set({ mode }),
          setJobId: (id) => set({ currentJobId: id }),                                                                                                                                                      
          setAnalysis: (a) => set(s => ({ currentAnalysis: a, history: [a, ...s.history].slice(0, 50) })),
          reset: () => set({ currentJobId: null, currentAnalysis: null }),                                                                                                                                  
        }),
        { name: 'ats-analysis', partialize: (s) => ({ history: s.history }) },                                                                                                                              
      ),                                                                                                                                                                                                    
    ),
  );                                                                                                                                                                                                        
                                                            
  ---
  18. API Versioning + Typed Request Validation (Zod)
                                                                                                                                                                                                            
  // src/api/v1/routes/resume.routes.ts
  import { z } from 'zod';                                                                                                                                                                                  
                                                                                                                                                                                                            
  const uploadSchema = z.object({
    name:           z.string().min(2).max(100),                                                                                                                                                             
    email:          z.string().email(),                     
    domain:         z.enum(['node.js', 'react', 'python', 'devops', ...]),                                                                                                                                  
    mode:           z.enum(['analyze', 'rewrite']).default('analyze'),                                                                                                                                      
    jobDescription: z.string().min(50).max(10000).optional(),                                                                                                                                               
  }).refine(                                                                                                                                                                                                
    (d) => d.mode === 'analyze' || !!d.jobDescription,      
    { message: 'jobDescription required in rewrite mode', path: ['jobDescription'] }                                                                                                                        
  );                                                                                                                                                                                                        
   
  router.post(                                                                                                                                                                                              
    '/upload',                                              
    uploadLimiter,
    authMiddleware.optional,                                                                                                                                                                                
    validateBody(uploadSchema),  // middleware wrapping zod.parse
    resumeController.upload,                                                                                                                                                                                
  );                                                        
                                                                                                                                                                                                            
  ---                                                       
  19. Improve AI Prompt Engineering (Chain-of-Thought + Structured Output)
                                                                                                                                                                                                            
  Current prompt weakness: Single-shot, no structure, no examples, no reasoning chain.
                                                                                                                                                                                                            
  Production-grade approach:                                
                                                                                                                                                                                                            
  // src/services/ai/prompts/rewrite.prompt.ts              
  export const buildRewritePrompt = (resume: string, jd: string, analysis: AnalysisResult) => `
  <system>                                                                                                                                                                                                  
  You are a FAANG-level resume coach and ATS optimization specialist.
  You have already analyzed this resume and know exactly what is missing.                                                                                                                                   
  </system>                                                 
                                                                                                                                                                                                            
                                                            
  <task>                                                                                                                                                                                                    
  Rewrite the resume below to achieve an ATS score above 85/100 for the job description provided.
                                                                                                                                                                                                            
  Step 1: Identify the top 10 keywords from the JD that are missing from the resume.
  Step 2: For each experience bullet, determine if a JD keyword can be truthfully incorporated.                                                                                                             
  Step 3: Rewrite each bullet starting with a strong action verb, incorporating 1-2 keywords.                                                                                                               
  Step 4: Rewrite the professional summary to mirror the JD's language exactly.                                                                                                                             
  Step 5: Ensure the skills section contains all critical keywords from the JD.                                                                                                                             
  </task>                                                                                                                                                                                                   
                                                                                                                                                                                                            
  <constraints>                                                                                                                                                                                             
  - Do NOT fabricate experience, certifications, or companies
  - Use plain text only — no markdown, no tables, no bullets with • or * symbols                                                                                                                            
  - Use standard section headers: PROFESSIONAL SUMMARY, EXPERIENCE, EDUCATION, SKILLS                                                                                                                       
  - Maximum bullet length: 2 lines                                                                                                                                                                          
  - Include at least 3 quantified achievements (%, $, numbers)                                                                                                                                              
  </constraints>                                                                                                                                                                                            
                                                                                                                                                                                                            
  <resume>${resume}</resume>                                
  <job_description>${jd}</job_description>                                                                                                                                                                  
  
  Output the complete rewritten resume only. No commentary.                                                                                                                                                 
  `;                                                                                                                                                                                                        
  
  ---                                                                                                                                                                                                       
  Section 4: Implementation Roadmap                         
                                   
  Phase 1 — Critical Foundation (Week 1–2)
                                                                                                                                                                                                            
  Goal: Make it production-worthy, not just a demo.                                                                                                                                                         
                                                                                                                                                                                                            
  ┌─────┬─────────────────────────────────────────────────┬──────────────────────────────────────┬────────┬──────────┐                                                                                      
  │  #  │                      Task                       │               Packages               │ Effort │  Impact  │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 1   │ Migrate backend to TypeScript                   │ typescript, ts-node, tsx             │ 4h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 2   │ Zod env validation                              │ zod                                  │ 1h     │ High     │                                                                                      
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤
  │ 3   │ Custom error classes + error handler middleware │ —                                    │ 2h     │ High     │                                                                                      
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 4   │ Winston structured logging + request tracer     │ winston, uuid                        │ 2h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 5   │ PostgreSQL + Prisma setup                       │ prisma, PostgreSQL                   │ 4h     │ Critical │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 6   │ API versioning (/api/v1/)                       │ —                                    │ 1h     │ Medium   │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 7   │ Zod request validation middleware               │ zod                                  │ 2h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 8   │ Rate limiting with Redis store                  │ express-rate-limit, rate-limit-redis │ 2h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 9   │ Helmet + CORS lockdown                          │ helmet                               │ 1h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 10  │ Add start + dev + typecheck scripts             │ tsx, nodemon                         │ 30m    │ Medium   │
  └─────┴─────────────────────────────────────────────────┴──────────────────────────────────────┴────────┴──────────┘                                                                                      
                                                            
  Deliverable: A backend that won't embarrass you in a code review.                                                                                                                                         
                                                            
  ---                                                                                                                                                                                                       
  Phase 2 — AI & Feature Enhancements (Week 3–4)            
                                                                                                                                                                                                            
  Goal: Turn it into something genuinely impressive.
                                                                                                                                                                                                            
  ┌─────┬───────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────┬────────┬──────────┐
  │  #  │                                     Task                                      │             Packages             │ Effort │  Impact  │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 1   │ BullMQ + Redis job queue for async processing                                 │ bullmq, ioredis                  │ 6h     │ Critical │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 2   │ SSE real-time progress updates                                                │ —                                │ 3h     │ High     │                                                            
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤
  │ 3   │ Enhanced ATS scoring (formatting checks, section detection, missing keywords) │ —                                │ 4h     │ High     │                                                            
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 4   │ AI keyword gap analysis (structured JSON output from Gemini)                  │ —                                │ 3h     │ High     │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 5   │ Improve AI prompts (CoT, constraints, structured output)                      │ —                                │ 2h     │ High     │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 6   │ Auth.js + Google OAuth                                                        │ next-auth, @auth/prisma-adapter  │ 5h     │ High     │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 7   │ User dashboard + analysis history                                             │ recharts                         │ 6h     │ High     │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 8   │ PDF export of rewritten resume                                                │ puppeteer or @react-pdf/renderer │ 4h     │ Medium   │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 9   │ Zustand state store + typed API client                                        │ zustand, ky                      │ 3h     │ Medium   │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 10  │ Split UploadSection into 5 focused components                                 │ —                                │ 2h     │ Medium   │
  └─────┴───────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────┴────────┴──────────┘                                                            
                                                            
  Deliverable: Something you'd genuinely demo to a hiring manager.                                                                                                                                          
                                                            
  ---                                                                                                                                                                                                       
  Phase 3 — SaaS Scalability (Week 5–6)                     

  Goal: Show you understand production systems.

  ┌─────┬─────────────────────────────────────────────────────┬───────────────────┬────────┬────────┐                                                                                                       
  │  #  │                        Task                         │     Packages      │ Effort │ Impact │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 1   │ Docker + Docker Compose (all services)              │ docker            │ 4h     │ High   │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤
  │ 2   │ GitHub Actions CI (typecheck + lint + test + build) │ —                 │ 3h     │ High   │                                                                                                       
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 3   │ Unit tests for analyzer + AI services               │ vitest, supertest │ 6h     │ High   │                                                                                                       
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 4   │ Resume versioning + side-by-side comparison         │ diff-match-patch  │ 4h     │ Medium │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 5   │ AI chat assistant (Gemini chat API + streaming)     │ —                 │ 5h     │ Medium │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 6   │ Redis response caching for analysis results         │ ioredis           │ 2h     │ Medium │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 7   │ Sentry error monitoring                             │ @sentry/node      │ 2h     │ Medium │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 8   │ Expand keywords.json to 25+ domains                 │ —                 │ 4h     │ Medium │
  └─────┴─────────────────────────────────────────────────────┴───────────────────┴────────┴────────┘                                                                                                       
                                                            
  Deliverable: A GitHub repo a senior engineer can clone and run with docker compose up.                                                                                                                    
   
  ---                                                                                                                                                                                                       
  Phase 4 — Enterprise Polish (Week 7–8)                    
                                                                                                                                                                                                            
  Goal: Recruiter-wow finishing touches.
                                                                                                                                                                                                            
  ┌─────┬──────────────────────────────────────────────────┬─────────────────────────┬──────────┐                                                                                                           
  │  #  │                       Task                       │        Packages         │  Impact  │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 1   │ Score trend chart with Recharts on dashboard     │ recharts                │ High     │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤
  │ 2   │ LinkedIn Job URL auto-fetch (scrape JD from URL) │ cheerio                 │ High     │                                                                                                           
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 3   │ Multiple resume templates for PDF export         │ —                       │ Medium   │                                                                                                           
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 4   │ Admin panel: all submissions, usage analytics    │ —                       │ Medium   │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 5   │ OpenTelemetry tracing                            │ @opentelemetry/sdk-node │ Medium   │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 6   │ Webhook support (Zapier/Make integration)        │ —                       │ Optional │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 7   │ Free tier limits + premium gate (Stripe ready)   │ stripe                  │ Optional │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 8   │ Playwright E2E tests for critical flows          │ playwright              │ Medium   │
  └─────┴──────────────────────────────────────────────────┴─────────────────────────┴──────────┘                                                                                                           
                                                            
  ---                                                                                                                                                                                                       
  Section 5: Quick Wins You Can Ship Today                  
                                          
  These require 30–60 minutes each and immediately improve code quality:
                                                                                                                                                                                                            
  // 1. Add start script to backend/package.json
  "scripts": {                                                                                                                                                                                              
    "start": "node dist/server.js",                         
    "dev": "tsx watch src/server.ts",                                                                                                                                                                       
    "build": "tsc",                                                                                                                                                                                         
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",                                                                                                                                                                                  
    "test": "vitest"                                        
  }                                                                                                                                                                                                         
  
  // 2. Fix: CORS is wide open                                                                                                                                                                              
  // Change: app.use(cors())                                
  // To:                                                                                                                                                                                                    
  app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
                                                                                                                                                                                                            
  // 3. Fix: hardcoded localhost in frontend                                                                                                                                                                
  // Change: fetch('http://localhost:5000/api/upload', ...)
  // To:                                                                                                                                                                                                    
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  fetch(`${API_URL}/api/upload`, ...)                                                                                                                                                                       
  
  // 4. Fix: no retry on Gemini calls                                                                                                                                                                       
  const result = await retry(                               
    () => model.generateContent(prompt),                                                                                                                                                                    
    { retries: 3, factor: 2, minTimeout: 1000 }                                                                                                                                                             
  );  // use 'async-retry' package
                                                                                                                                                                                                            
  // 5. Fix: email sent synchronously (wrap in setImmediate or queue)                                                                                                                                       
  // Don't await email in the response path:                                                                                                                                                                
  setImmediate(() => emailService.send(...));  // fire-and-forget                                                                                                                                           
  // Or better: add to BullMQ queue                                                                                                                                                                         
                                                                                                                                                                                                            
  // 6. Add .env.example to the repo (remove actual secrets from README)                                                                                                                                    
  // 7. Add .gitignore entry for *.log, uploads/, dist/     
                                                                                                                                                                                                            
  ---                                                       
  Final Assessment                                                                                                                                                                                          
                                                                                                                                                                                                            
  ┌──────────────────────────┬─────────┬───────────────┬───────────────┬───────────────┐
  │         Category         │ Current │ After Phase 1 │ After Phase 2 │ After Phase 4 │                                                                                                                    
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤
  │ Architecture             │ 3/10    │ 7/10          │ 8/10          │ 9/10          │                                                                                                                    
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤
  │ AI Depth                 │ 5/10    │ 5/10          │ 8/10          │ 9/10          │                                                                                                                    
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤                                                                                                                    
  │ Production Readiness     │ 2/10    │ 7/10          │ 8/10          │ 9/10          │                                                                                                                    
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤                                                                                                                    
  │ Security                 │ 2/10    │ 8/10          │ 8/10          │ 9/10          │
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤                                                                                                                    
  │ Scalability              │ 1/10    │ 5/10          │ 8/10          │ 9/10          │
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤                                                                                                                    
  │ Portfolio Impressiveness │ 5/10    │ 6/10          │ 8/10          │ 10/10         │
  └──────────────────────────┴─────────┴───────────────┴───────────────┴───────────────┘                                                                                                                    
   
  Interview talking points this unlocks after Phase 2:                                                                                                                                                      
  - "I implemented BullMQ with Redis for async AI processing — here's why I chose SSE over WebSockets for progress streaming"
  - "The scoring engine detects ATS formatting failures like table usage and missing quantified achievements"                                                                                               
  - "I used Gemini's structured JSON output mode with Zod schema validation to ensure reliable AI responses" 
  - "I designed the Prisma schema with composite indexes on (userId, createdAt) to support efficient dashboard pagination"                                                                                  
                                                                                                                                                                                                            
  That's the difference between a portfolio project and a product engineering interview.                                                                                                                    
                                                                                                                                                                                                            
✻ Cogitated for 3m 51s                                                                                                                         Let me read the full codebase before analyzing anything.
                                                                            
  Searched for 2 patterns, read 6 files (ctrl+o to expand)     
                                                                                                                                                                                                            
⏺ I have a complete picture of the entire stack. Let me write the full audit and roadmap now.                                                                                                               
                                                                                                                                                                                                            
  ---                                                                                                                                                                                                     
  ATS Resume Analyzer — Senior Engineer Audit & 2026 SaaS Upgrade Roadmap                                                                                                                                   
                                                                                                                                                                                                            
  Section 1: Current Architecture Audit                                                                                                                                                                     
                                                                                                                                                                                                            
  What you have (honestly assessed)                                                                                                                                                                         
                                                                                                                                                                                                            
  BACKEND                                                                                                                                                                                                   
  ├── server.js              ← monolithic entry, no middleware stack                                                                                                                                        
  ├── controllers/                                                                                                                                                                                          
  │   └── uploadController.js ← does parsing + analysis + email + telegram in one fn
  ├── services/                                                                                                                                                                                             
  │   ├── analyzerService.js  ← keyword match only, no ML, no semantic scoring
  │   ├── aiService.js        ← single Gemini call, no retry, no streaming                                                                                                                                  
  │   ├── emailService.js     ← no queue, sends synchronously blocking the response
  │   └── telegramService.js  ← fire-and-forget, no error recovery                                                                                                                                          
  └── config/                                                                                                                                                                                               
      └── keywords.json       ← 8 domains, ~10 keywords each — far too sparse                                                                                                                               
                                                                                                                                                                                                            
  FRONTEND                                                  
  └── src/                                                                                                                                                                                                  
      ├── app/page.tsx         ← landing + all sections in one file
      └── components/                                                                                                                                                                                       
          └── UploadSection.tsx ← entire wizard, all state, all API calls in one 700-line component
                                                                                                                                                                                                            
  INFRASTRUCTURE                                            
  └── Nothing — no DB, no cache, no queue, no auth, no Docker, no CI/CD                                                                                                                                     
                                                                                                                                                                                                            
  Critical gaps vs a real 2026 SaaS product                                                                                                                                                                 
                                                                                                                                                                                                            
  ┌────────────────────────────────────────────┬──────────┬────────────────────────────────┐                                                                                                                
  │                    Gap                     │ Severity │ Impact on Recruiter Impression │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No database — nothing persists             │ Critical │ Disqualifying                  │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No authentication                          │ Critical │ Disqualifying                  │                                                                                                                
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤
  │ Email sent synchronously — blocks response │ Critical │ Poor architecture signal       │                                                                                                                
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ CORS: app.use(cors()) — fully open         │ Critical │ Security red flag              │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No rate limiting — trivially abused        │ High     │ Production gap                 │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ keywords.json is the "AI engine"           │ High     │ Not impressive                 │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ Hardcoded localhost:5000 in frontend       │ High     │ Amateur signal                 │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No API versioning                          │ High     │ Architecture gap               │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No logging or observability                │ High     │ Not production-ready           │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No error handling middleware               │ High     │ Code quality signal            │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ Backend is plain JS (no TypeScript)        │ Medium   │ Quality signal                 │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No tests whatsoever                        │ Medium   │ Professional gap               │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No Docker                                  │ Medium   │ DevOps gap                     │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No CI/CD                                   │ Medium   │ DevOps gap                     │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤
  │ Single component 700+ lines                │ Medium   │ Frontend architecture          │
  ├────────────────────────────────────────────┼──────────┼────────────────────────────────┤                                                                                                                
  │ No env validation (typos crash silently)   │ Medium   │ Reliability gap                │
  └────────────────────────────────────────────┴──────────┴────────────────────────────────┘                                                                                                                
                                                            
  ---                                                                                                                                                                                                       
  Section 2: Proposed Production Architecture               

  ats-analyzer/
  ├── backend/                          ← Node.js + TypeScript + Express
  │   ├── src/                                                                                                                                                                                              
  │   │   ├── api/
  │   │   │   └── v1/                                                                                                                                                                                       
  │   │   │       ├── routes/                               
  │   │   │       │   ├── auth.routes.ts                                                                                                                                                                    
  │   │   │       │   ├── resume.routes.ts                  
  │   │   │       │   ├── analysis.routes.ts                                                                                                                                                                
  │   │   │       │   └── user.routes.ts
  │   │   │       └── index.ts                                                                                                                                                                              
  │   │   ├── controllers/                                  
  │   │   │   ├── auth.controller.ts                                                                                                                                                                        
  │   │   │   ├── resume.controller.ts                      
  │   │   │   └── analysis.controller.ts                                                                                                                                                                    
  │   │   ├── services/
  │   │   │   ├── resume/                                                                                                                                                                                   
  │   │   │   │   ├── parser.service.ts     ← PDF/DOCX extraction                                                                                                                                           
  │   │   │   │   ├── analyzer.service.ts   ← ATS scoring engine
  │   │   │   │   └── rewriter.service.ts   ← Gemini AI rewrite                                                                                                                                             
  │   │   │   ├── ai/                                                                                                                                                                                       
  │   │   │   │   ├── gemini.service.ts     ← Gemini client + retry logic                                                                                                                                   
  │   │   │   │   └── prompts/              ← prompt templates as files                                                                                                                                     
  │   │   │   ├── queue/                                                                                                                                                                                    
  │   │   │   │   ├── queue.service.ts      ← BullMQ setup                                                                                                                                                  
  │   │   │   │   └── workers/                                                                                                                                                                              
  │   │   │   │       ├── email.worker.ts                                                                                                                                                                   
  │   │   │   │       └── analysis.worker.ts
  │   │   │   ├── email.service.ts                                                                                                                                                                          
  │   │   │   └── notification.service.ts   ← Telegram + future channels                                                                                                                                    
  │   │   ├── repositories/                                                                                                                                                                                 
  │   │   │   ├── user.repository.ts                                                                                                                                                                        
  │   │   │   ├── resume.repository.ts                                                                                                                                                                      
  │   │   │   └── analysis.repository.ts                                                                                                                                                                    
  │   │   ├── middleware/
  │   │   │   ├── auth.middleware.ts                                                                                                                                                                        
  │   │   │   ├── rateLimit.middleware.ts                   
  │   │   │   ├── validate.middleware.ts    ← Zod schema validation                                                                                                                                         
  │   │   │   ├── errorHandler.middleware.ts
  │   │   │   └── requestLogger.middleware.ts                                                                                                                                                               
  │   │   ├── config/                                       
  │   │   │   ├── env.ts                   ← Zod-validated env                                                                                                                                              
  │   │   │   ├── database.ts              ← Prisma client                                                                                                                                                  
  │   │   │   ├── redis.ts                 ← ioredis client
  │   │   │   └── keywords/                                                                                                                                                                                 
  │   │   │       └── *.json               ← per-domain keyword files
  │   │   ├── lib/                                                                                                                                                                                          
  │   │   │   ├── logger.ts                ← Winston structured logger
  │   │   │   └── errors.ts                ← custom error classes                                                                                                                                           
  │   │   ├── types/                                                                                                                                                                                        
  │   │   │   └── index.ts                                                                                                                                                                                  
  │   │   └── server.ts                                                                                                                                                                                     
  │   ├── prisma/                                           
  │   │   ├── schema.prisma
  │   │   └── migrations/                                                                                                                                                                                   
  │   ├── tests/
  │   │   ├── unit/                                                                                                                                                                                         
  │   │   └── integration/                                  
  │   ├── Dockerfile
  │   ├── .env.example                                                                                                                                                                                      
  │   └── tsconfig.json
  │                                                                                                                                                                                                         
  ├── frontend/                          ← Next.js 15 + TypeScript
  │   ├── src/                                                                                                                                                                                              
  │   │   ├── app/
  │   │   │   ├── (marketing)/            ← route group                                                                                                                                                     
  │   │   │   │   └── page.tsx            ← landing page                                                                                                                                                    
  │   │   │   ├── (auth)/
  │   │   │   │   ├── login/page.tsx                                                                                                                                                                        
  │   │   │   │   └── register/page.tsx                     
  │   │   │   ├── dashboard/                                                                                                                                                                                
  │   │   │   │   ├── page.tsx            ← user dashboard                                                                                                                                                  
  │   │   │   │   ├── history/page.tsx    ← analysis history
  │   │   │   │   └── resume/[id]/page.tsx                                                                                                                                                                  
  │   │   │   └── api/                                      
  │   │   │       └── auth/[...nextauth]/  ← Auth.js                                                                                                                                                        
  │   │   ├── components/                                                                                                                                                                                   
  │   │   │   ├── upload/
  │   │   │   │   ├── UploadWizard.tsx                                                                                                                                                                      
  │   │   │   │   ├── DomainStep.tsx                        
  │   │   │   │   ├── DetailsStep.tsx                                                                                                                                                                       
  │   │   │   │   └── FileStep.tsx                          
  │   │   │   ├── results/                                                                                                                                                                                  
  │   │   │   │   ├── ScoreDashboard.tsx                    
  │   │   │   │   ├── RadialGauge.tsx                                                                                                                                                                       
  │   │   │   │   ├── KeywordGapAnalysis.tsx                                                                                                                                                                
  │   │   │   │   └── SuggestionCard.tsx
  │   │   │   ├── dashboard/                                                                                                                                                                                
  │   │   │   │   ├── AnalysisHistory.tsx                   
  │   │   │   │   ├── ScoreTrendChart.tsx                                                                                                                                                                   
  │   │   │   │   └── ResumeVersionCard.tsx                 
  │   │   │   └── ui/                     ← shadcn/ui components                                                                                                                                            
  │   │   ├── hooks/                                        
  │   │   │   ├── useAnalysis.ts                                                                                                                                                                            
  │   │   │   ├── useResumeHistory.ts                       
  │   │   │   └── useRealtimeProgress.ts  ← SSE hook                                                                                                                                                        
  │   │   ├── lib/                                                                                                                                                                                          
  │   │   │   ├── api.ts                  ← typed API client
  │   │   │   └── auth.ts                                                                                                                                                                                   
  │   │   └── stores/                                                                                                                                                                                       
  │   │       └── analysisStore.ts        ← Zustand
  │   └── ...                                                                                                                                                                                               
  │                                                         
  ├── docker-compose.yml                 ← postgres + redis + backend + frontend                                                                                                                            
  ├── .github/                                                                                                                                                                                              
  │   └── workflows/
  │       ├── ci.yml                                                                                                                                                                                        
  │       └── deploy.yml                                    
  └── README.md
                                                                                                                                                                                                            
  ---
  Section 3: Features by Priority                                                                                                                                                                           
                                                            
  ---
  🔴 HIGH IMPACT — Phase 1 (Weeks 1–2)

  ---
  1. PostgreSQL + Prisma ORM

  Why it matters for recruiters: A stateless app that throws away every analysis is a toy, not a product. Persistence enables user history, analytics, A/B testing, and everything meaningful.

  Tech: prisma, @prisma/client, PostgreSQL 16

  Schema:

  // prisma/schema.prisma

  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }                                                                                                                                                                                                         
   
  model User {                                                                                                                                                                                              
    id           String     @id @default(cuid())            
    email        String     @unique
    name         String?
    passwordHash String?
    provider     String     @default("email")  // email | google | github                                                                                                                                   
    createdAt    DateTime   @default(now())
    updatedAt    DateTime   @updatedAt                                                                                                                                                                      
    analyses     Analysis[]                                                                                                                                                                                 
    resumes      Resume[]
  }                                                                                                                                                                                                         
                                                            
  model Resume {
    id           String     @id @default(cuid())
    userId       String?                                                                                                                                                                                    
    originalName String
    mimeType     String                                                                                                                                                                                     
    sizeBytes    Int                                        
    storagePath  String?    // S3/R2 key if using object storage
    extractedText String?   @db.Text                                                                                                                                                                        
    createdAt    DateTime   @default(now())                                                                                                                                                                 
    analyses     Analysis[]                                                                                                                                                                                 
    user         User?      @relation(fields: [userId], references: [id])                                                                                                                                   
  }                                                         

  model Analysis {                                                                                                                                                                                          
    id             String   @id @default(cuid())
    userId         String?                                                                                                                                                                                  
    resumeId       String                                   
    mode           String   // analyze | rewrite
    domain         String
    score          Int?                                                                                                                                                                                     
    keywordsMatched String[] // PostgreSQL array
    keywordsMissed String[]                                                                                                                                                                                 
    suggestions    String[]                                                                                                                                                                                 
    rewrittenText  String?  @db.Text
    jobDescription String?  @db.Text                                                                                                                                                                        
    emailSent      Boolean  @default(false)                 
    processingMs   Int?     // track performance                                                                                                                                                            
    createdAt      DateTime @default(now())                                                                                                                                                                 
    user           User?    @relation(fields: [userId], references: [id])
    resume         Resume   @relation(fields: [resumeId], references: [id])                                                                                                                                 
                                                                                                                                                                                                            
    @@index([userId])
    @@index([domain])                                                                                                                                                                                       
    @@index([createdAt])                                    
  }

  Recruiter impact: Shows you understand data modeling, indexing strategy, and relational design — not just CRUD tutorials.                                                                                 
   
  ---                                                                                                                                                                                                       
  2. BullMQ + Redis Job Queue                               
                                                                                                                                                                                                            
  Why it matters: Right now handleUpload blocks the HTTP response for up to 30 seconds while Gemini processes. This is production-fatal — one slow request blocks the Node.js event loop path, and users get
   timeout errors. A job queue decouples processing from response.                                                                                                                                          
                                                            
  Tech: bullmq, ioredis                                                                                                                                                                                     
                                                            
  Architecture:                                                                                                                                                                                             
                                                            
  // src/services/queue/queue.service.ts
  import { Queue, Worker, QueueEvents } from 'bullmq';
  import { redis } from '../../config/redis';                                                                                                                                                               
   
  export const analysisQueue = new Queue('resume-analysis', {                                                                                                                                               
    connection: redis,                                      
    defaultJobOptions: {                                                                                                                                                                                    
      attempts: 3,                                          
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,                                                                                                                                                                                    
    },
  });                                                                                                                                                                                                       
                                                            
  // Controller: immediately returns a jobId                                                                                                                                                                
  export const enqueueAnalysis = async (payload: AnalysisJobPayload) => {
    const job = await analysisQueue.add('analyze', payload, {                                                                                                                                               
      priority: payload.mode === 'rewrite' ? 1 : 2,                                                                                                                                                         
    });                                                                                                                                                                                                     
    return job.id;                                                                                                                                                                                          
  };                                                                                                                                                                                                        
                                                            
  // src/services/queue/workers/analysis.worker.ts
  const worker = new Worker('resume-analysis', async (job) => {
    const { resumeBuffer, mode, domain, jobDescription, userId } = job.data;                                                                                                                                
                                                                                                                                                                                                            
    await job.updateProgress(10);                                                                                                                                                                           
    const text = await parserService.extract(resumeBuffer);                                                                                                                                                 
                                                                                                                                                                                                            
    await job.updateProgress(30);
    const result = mode === 'rewrite'                                                                                                                                                                       
      ? await rewriterService.rewrite(text, jobDescription)                                                                                                                                                 
      : await analyzerService.analyze(text, domain);
                                                                                                                                                                                                            
    await job.updateProgress(80);                                                                                                                                                                           
    await emailService.send(result);
                                                                                                                                                                                                            
    await job.updateProgress(100);                          
    return result;
  }, { connection: redis, concurrency: 5 });
                                                                                                                                                                                                            
  Frontend: Poll /api/v1/jobs/:jobId/status or use SSE (see feature 6) for real-time progress.                                                                                                              
                                                                                                                                                                                                            
  Recruiter impact: Demonstrates understanding of async processing, worker concurrency, retry logic, and backpressure — patterns used at every serious backend.                                             
                                                            
  ---                                                                                                                                                                                                       
  3. Zod Environment Validation                             
                                                                                                                                                                                                            
  Why it matters: Silent misconfiguration is a production killer. Your app currently starts fine with a missing GEMINI_API_KEY and crashes only when a user triggers the AI path.
                                                                                                                                                                                                            
  Tech: zod                                                 
                                                                                                                                                                                                            
  // src/config/env.ts                                      
  import { z } from 'zod';

  const envSchema = z.object({
    NODE_ENV:               z.enum(['development', 'production', 'test']),
    PORT:                   z.coerce.number().default(5000),                                                                                                                                                
    DATABASE_URL:           z.string().url(),
    REDIS_URL:              z.string().url(),                                                                                                                                                               
    GEMINI_API_KEY:         z.string().min(1),              
    SMTP_HOST:              z.string(),                                                                                                                                                                     
    SMTP_PORT:              z.coerce.number().default(587),                                                                                                                                                 
    SMTP_USER:              z.string().email(),
    SMTP_PASS:              z.string().min(1),                                                                                                                                                              
    JWT_SECRET:             z.string().min(32),                                                                                                                                                             
    TELEGRAM_BOT_TOKEN:     z.string().optional(),
    TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),                                                                                                                                                          
    FRONTEND_URL:           z.string().url().default('http://localhost:3000'),                                                                                                                              
    MAX_FILE_SIZE_MB:       z.coerce.number().default(5),
  });                                                                                                                                                                                                       
                                                            
  export const env = envSchema.parse(process.env); // throws on startup if invalid                                                                                                                          
                                                            
  Recruiter impact: Shows you write defensive, fail-fast code — the kind senior engineers write.                                                                                                            
                                                            
  ---                                                                                                                                                                                                       
  4. Structured Error Handling + Winston Logging            
                                                
  Why it matters: console.error is not logging. Real apps need structured JSON logs, log levels, request correlation IDs, and log shipping to a service (Datadog, Logtail, etc.).
                                                                                                                                                                                                            
  Tech: winston, express-async-errors, uuid                                                                                                                                                                 
                                                                                                                                                                                                            
  // src/lib/logger.ts                                                                                                                                                                                      
  import winston from 'winston';                            

  export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(                                                                                                                                                                         
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),                                                                                                                                                               
      winston.format.json(),                                
    ),                                                                                                                                                                                                      
    transports: [
      new winston.transports.Console({                                                                                                                                                                      
        format: process.env.NODE_ENV === 'development'      
          ? winston.format.prettyPrint()
          : winston.format.json(),                                                                                                                                                                          
      }),
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),                                                                                                                          
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ],                                                                                                                                                                                                      
  });
                                                                                                                                                                                                            
  // src/lib/errors.ts                                      
  export class AppError extends Error {
    constructor(                                                                                                                                                                                            
      public message: string,
      public statusCode: number = 500,                                                                                                                                                                      
      public code: string = 'INTERNAL_ERROR',               
    ) {
      super(message);                                                                                                                                                                                       
      this.name = 'AppError';
    }                                                                                                                                                                                                       
  }                                                         

  export class ValidationError extends AppError {
    constructor(message: string) { super(message, 400, 'VALIDATION_ERROR'); }
  }                                                                                                                                                                                                         
   
  export class RateLimitError extends AppError {                                                                                                                                                            
    constructor() { super('Too many requests', 429, 'RATE_LIMIT_EXCEEDED'); }
  }

  // src/middleware/errorHandler.middleware.ts
  import { logger } from '../lib/logger';                                                                                                                                                                   
  import { AppError } from '../lib/errors';
                                                                                                                                                                                                            
  export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {                                                                                                                               
    const requestId = req.headers['x-request-id'] as string;
                                                                                                                                                                                                            
    logger.error({                                                                                                                                                                                          
      message: err.message,
      stack: err.stack,                                                                                                                                                                                     
      requestId,                                            
      path: req.path,
      method: req.method,
    });                                                                                                                                                                                                     
   
    if (err instanceof AppError) {                                                                                                                                                                          
      return res.status(err.statusCode).json({              
        success: false,
        error: { code: err.code, message: err.message },
        requestId,
      });                                                                                                                                                                                                   
    }
                                                                                                                                                                                                            
    res.status(500).json({                                  
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      requestId,                                                                                                                                                                                            
    });
  };                                                                                                                                                                                                        
                                                            
  ---
  5. Rate Limiting + Security Hardening
                                       
  Why it matters: Your API is fully open — anyone can hit /api/upload 10,000 times and rack up Gemini API bills, spam emails, or DoS the server.
                                                                                                                                                                                                            
  Tech: express-rate-limit, rate-limit-redis, helmet, express-mongo-sanitize                                                                                                                                
                                                                                                                                                                                                            
  // src/middleware/rateLimit.middleware.ts                                                                                                                                                                 
  import rateLimit from 'express-rate-limit';               
  import RedisStore from 'rate-limit-redis';                                                                                                                                                                
  import { redis } from '../config/redis';
                                                                                                                                                                                                            
  export const apiLimiter = rateLimit({                                                                                                                                                                     
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100,                                                                                                                                                                                               
    standardHeaders: true,                                  
    legacyHeaders: false,
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),                                                                                                                               
  });                                                                                                                                                                                                       
                                                                                                                                                                                                            
  export const uploadLimiter = rateLimit({                                                                                                                                                                  
    windowMs: 60 * 60 * 1000,   // 1 hour                   
    max: 10,                     // max 10 analyses per hour per IP
    message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Max 10 analyses per hour' } },                                                                                                               
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),                                                                                                                               
  });                                                                                                                                                                                                       
                                                                                                                                                                                                            
  // server.ts                                              
  app.use(helmet());              // sets 11 security headers                                                                                                                                               
  app.use(compression());         // gzip all responses     
  app.use(cors({                                                                                                                                                                                            
    origin: env.FRONTEND_URL,
    credentials: true,                                                                                                                                                                                      
    methods: ['GET', 'POST'],                               
  }));                                                                                                                                                                                                      
  app.use('/api/v1/resume', uploadLimiter);
  app.use('/api', apiLimiter);                                                                                                                                                                              
                                                            
  ---                                                                                                                                                                                                       
  6. Server-Sent Events for Real-Time Progress
                                                                                                                                                                                                            
  Why it matters: Users staring at a spinner for 20–30 seconds (Gemini rewrite) is terrible UX. SSE pushes live progress updates — "Extracting text… Analysing keywords… Rewriting with AI… Sending email…"
  — for near-zero cost (no WebSocket infrastructure).                                                                                                                                                       
   
  Backend:                                                                                                                                                                                                  
                                                            
  // src/api/v1/routes/analysis.routes.ts                                                                                                                                                                   
  router.get('/jobs/:jobId/stream', authMiddleware.optional, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');                                                                                                                                                     
    res.setHeader('Cache-Control', 'no-cache');                                                                                                                                                             
    res.setHeader('Connection', 'keep-alive');                                                                                                                                                              
    res.flushHeaders();                                                                                                                                                                                     
                                                            
    const queueEvents = new QueueEvents('resume-analysis', { connection: redis });                                                                                                                          
   
    const send = (event: string, data: object) => {                                                                                                                                                         
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };                                                                                                                                                                                                      
                                                            
    queueEvents.on('progress', ({ jobId, data }) => {                                                                                                                                                       
      if (jobId === req.params.jobId) send('progress', data);
    });                                                                                                                                                                                                     
                                                                                                                                                                                                            
    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      if (jobId === req.params.jobId) {                                                                                                                                                                     
        send('completed', returnvalue);                                                                                                                                                                     
        res.end();
      }                                                                                                                                                                                                     
    });                                                     

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      if (jobId === req.params.jobId) {
        send('error', { message: failedReason });                                                                                                                                                           
        res.end();
      }                                                                                                                                                                                                     
    });                                                     

    req.on('close', () => queueEvents.close());                                                                                                                                                             
  });
                                                                                                                                                                                                            
  Frontend hook:                                            

  // src/hooks/useRealtimeProgress.ts
  export const useRealtimeProgress = (jobId: string | null) => {
    const [progress, setProgress] = useState<ProgressState | null>(null);                                                                                                                                   
  
    useEffect(() => {                                                                                                                                                                                       
      if (!jobId) return;                                   
      const es = new EventSource(`/api/v1/jobs/${jobId}/stream`);                                                                                                                                           
      es.addEventListener('progress', e => setProgress(JSON.parse(e.data)));
      es.addEventListener('completed', e => { setProgress(JSON.parse(e.data)); es.close(); });                                                                                                              
      es.addEventListener('error', () => es.close());       
      return () => es.close();                                                                                                                                                                              
    }, [jobId]);                                            
                                                                                                                                                                                                            
    return progress;                                        
  };

  Recruiter impact: Real-time features, event-driven architecture, SSE vs WebSocket trade-off knowledge — these are senior-level signals.                                                                   
   
  ---                                                                                                                                                                                                       
  🟡 MEDIUM IMPACT — Phase 2 (Weeks 3–4)                    
                                                                                                                                                                                                            
  ---
  7. Authentication with Auth.js (NextAuth v5)                                                                                                                                                              
                                                                                                                                                                                                            
  Why it matters: Without auth, every analysis is anonymous and disposable. Auth enables user dashboards, history, personalization — the entire SaaS value proposition.
                                                                                                                                                                                                            
  Tech: next-auth (v5 / Auth.js), Google OAuth + email magic link                                                                                                                                           
                                                                                                                                                                                                            
  // src/app/api/auth/[...nextauth]/route.ts                                                                                                                                                                
  import NextAuth from 'next-auth';                                                                                                                                                                         
  import Google from 'next-auth/providers/google';
  import Resend from 'next-auth/providers/resend';                                                                                                                                                          
  import { PrismaAdapter } from '@auth/prisma-adapter';                                                                                                                                                     
  import { prisma } from '@/lib/prisma';
                                                                                                                                                                                                            
  export const { handlers, auth, signIn, signOut } = NextAuth({                                                                                                                                             
    adapter: PrismaAdapter(prisma),
    providers: [                                                                                                                                                                                            
      Google({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }),
      Resend({ apiKey: env.RESEND_API_KEY, from: 'auth@ats-analyzer.com' }),                                                                                                                                
    ],
    callbacks: {                                                                                                                                                                                            
      session: ({ session, user }) => ({                                                                                                                                                                    
        ...session,
        user: { ...session.user, id: user.id },                                                                                                                                                             
      }),                                                   
    },
  });                                                                                                                                                                                                       
  
  Backend JWT middleware for API routes:                                                                                                                                                                    
                                                            
  // src/middleware/auth.middleware.ts
  import jwt from 'jsonwebtoken';                                                                                                                                                                           
  
  export const authMiddleware = {                                                                                                                                                                           
    required: (req, res, next) => {                         
      const token = req.cookies['next-auth.session-token']
        || req.headers.authorization?.replace('Bearer ', '');                                                                                                                                               
      if (!token) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      // verify and attach user                                                                                                                                                                             
      next();                                               
    },                                                                                                                                                                                                      
    optional: (req, res, next) => {                         
      // attach user if token present, continue either way                                                                                                                                                  
      next();                                                                                                                                                                                               
    },
  };                                                                                                                                                                                                        
                                                            
  ---
  8. Enhanced ATS Scoring Engine
                                
  Why it matters: Your current scoring is keyword count / 15 * 70. That is not ATS analysis — that's ctrl+F. Real ATS engines (Workday, Greenhouse, Lever) use TF-IDF, semantic similarity, section parsing,
   and formatting analysis.                                                                                                                                                                                 
   
  Improvements:                                                                                                                                                                                             
                                                            
  // src/services/resume/analyzer.service.ts
                                                                                                                                                                                                            
  interface AnalysisResult {
    score: number;                                                                                                                                                                                          
    breakdown: {                                            
      keywordScore: number;       // 0-40: exact + semantic keyword match
      achievementScore: number;   // 0-25: quantified results detection                                                                                                                                     
      formattingScore: number;    // 0-20: ATS-friendly structure                                                                                                                                           
      readabilityScore: number;   // 0-15: sentence complexity, bullet length                                                                                                                               
    };                                                                                                                                                                                                      
    matchedKeywords: string[];                                                                                                                                                                              
    missingKeywords: string[];    // NEW: tell users exactly what's missing                                                                                                                                 
    keywordDensity: number;       // keyword density percentage                                                                                                                                             
    sectionDetected: {            // NEW: section presence                                                                                                                                                  
      summary: boolean;                                                                                                                                                                                     
      experience: boolean;                                                                                                                                                                                  
      education: boolean;                                                                                                                                                                                   
      skills: boolean;                                      
      projects: boolean;
    };
    warnings: string[];           // NEW: specific ATS failure reasons
    suggestions: string[];                                                                                                                                                                                  
  }
                                                                                                                                                                                                            
  // Semantic keyword matching using embedding similarity:                                                                                                                                                  
  const semanticMatch = async (resumeText: string, keywords: string[]) => {
    // Use Gemini embeddings API to find semantically similar terms                                                                                                                                         
    // e.g., "Node.js" matches "server-side JavaScript", "backend JS"                                                                                                                                       
    const embeddings = await gemini.embedContent(resumeText);                                                                                                                                               
    // cosine similarity matching                                                                                                                                                                           
  };                                                                                                                                                                                                        
                                                            
  // ATS formatting checks:                                                                                                                                                                                 
  const formattingChecks = (text: string): string[] => {    
    const warnings = [];
    if (/[│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌]/u.test(text))                                                                                                                                           
      warnings.push('Tables detected — ATS cannot parse table content');                                                                                                                                    
    if (text.length < 400)                                                                                                                                                                                  
      warnings.push('Resume appears too short — add more detail');                                                                                                                                          
    if (!/\b(19|20)\d{2}\b/.test(text))                                                                                                                                                                     
      warnings.push('No dates detected — add employment date ranges');                                                                                                                                      
    if (!/\b\d+[%x]\b|\$[\d,]+|\d+\+\s*(years?|clients?|projects?)/i.test(text))                                                                                                                            
      warnings.push('No quantified achievements — add metrics (%, $, numbers)');                                                                                                                            
    if ((text.match(/\b(responsible for|duties included|worked on)\b/gi) || []).length > 2)                                                                                                                 
      warnings.push('Weak phrasing detected — replace with action verbs');                                                                                                                                  
    return warnings;                                                                                                                                                                                        
  };                                                                                                                                                                                                        
                                                                                                                                                                                                            
  Add more domains: Expand keywords.json to 25+ domains with 50+ keywords each, covering: Data Engineering, Mobile (iOS/Android), Cloud Architecture, Product Management, UI/UX Design, Blockchain, ML      
  Engineering, SRE, etc.
                                                                                                                                                                                                            
  ---                                                       
  9. AI-Powered Keyword Gap Analysis
                                    
  Why it matters: "You scored 65%" is useless. "You're missing 8 keywords the JD requires: Kubernetes, Terraform, SLO/SLI, incident management — here's how to add them" is actionable gold.
                                                                                                                                                                                                            
  Implementation:
                                                                                                                                                                                                            
  // src/services/ai/prompts/keyword-gap.ts                 
  export const keywordGapPrompt = (resumeText: string, jd: string) => `                                                                                                                                     
  You are an ATS expert. Compare the resume against the job description.                                                                                                                                    
                                                                                                                                                                                                            
  Return ONLY valid JSON matching this schema:                                                                                                                                                              
  {                                                                                                                                                                                                         
    "criticalMissing": ["keyword that appears 3+ times in JD but not in resume"],
    "nicetohaveMissing": ["keyword appears once in JD, not in resume"],                                                                                                                                     
    "presentKeywords": ["keywords found in both"],                                                                                                                                                          
    "keywordDensityIssues": ["keywords present but underutilized"],                                                                                                                                         
    "overusedPhrases": ["clichés that weaken the resume"],                                                                                                                                                  
    "recommendedAdditions": [                                                                                                                                                                               
      { "keyword": "...", "where": "Skills section", "example": "Managed Kubernetes clusters across 3 environments" }                                                                                       
    ]                                                                                                                                                                                                       
  }                                                                                                                                                                                                         
                                                                                                                                                                                                            
  RESUME: ${resumeText}                                     
  JOB DESCRIPTION: ${jd}
  `;

  Gemini with structured output (JSON mode):                                                                                                                                                                
   
  const result = await model.generateContent({                                                                                                                                                              
    contents: [{ role: 'user', parts: [{ text: prompt }] }],                                                                                                                                                
    generationConfig: {
      responseMimeType: 'application/json',  // Gemini 1.5 structured output                                                                                                                                
      responseSchema: KeywordGapSchema,       // Zod schema → JSON Schema                                                                                                                                   
    },                                                                                                                                                                                                      
  });                                                                                                                                                                                                       
                                                                                                                                                                                                            
  ---                                                       
  10. User Dashboard with Analysis History
                                          
  Why it matters: The entire point of a SaaS is that users come back. A dashboard showing score trends over time is the #1 retention feature.
                                                                                                                                                                                                            
  // src/app/dashboard/page.tsx — key data points:
  // - Score trend chart (Recharts/Victory) across all analyses                                                                                                                                             
  // - Last 5 resume versions side-by-side score comparison                                                                                                                                                 
  // - Keyword gap heatmap: which skills appear most across all their JDs                                                                                                                                   
  // - Domain distribution: what roles they're applying for                                                                                                                                                 
  // - "Your best performing resume" highlight                                                                                                                                                              
                                                                                                                                                                                                            
  API endpoint:                                                                                                                                                                                             
                                                                                                                                                                                                            
  // GET /api/v1/users/:id/analytics                        
  {                                                                                                                                                                                                         
    "totalAnalyses": 12,
    "avgScore": 67,                                                                                                                                                                                         
    "scoreImprovement": +15,        // since first analysis                                                                                                                                                 
    "topMissingKeywords": ["Kubernetes", "Terraform", "gRPC"],
    "scoreOverTime": [                                                                                                                                                                                      
      { "date": "2026-05-01", "score": 52, "domain": "DevOps" },
      { "date": "2026-05-07", "score": 67, "domain": "DevOps" }                                                                                                                                             
    ],                                                                                                                                                                                                      
    "bestScore": { "score": 84, "analysisId": "..." }                                                                                                                                                       
  }                                                                                                                                                                                                         
                                                            
  ---                                                                                                                                                                                                       
  11. Resume Versioning + Side-by-Side Comparison           
                                                                                                                                                                                                            
  Why it matters: Users iterate on their resumes. Showing "Version 3 scored 12 points higher than Version 1 because you added these 4 keywords" is a killer feature no free competitor has.
                                                                                                                                                                                                            
  // GET /api/v1/resumes/:id/versions                       
  // GET /api/v1/analyses/compare?ids=id1,id2                                                                                                                                                               
                                                                                                                                                                                                            
  // Frontend: side-by-side diff viewer                                                                                                                                                                     
  // Use diff-match-patch or react-diff-viewer to show exactly what changed                                                                                                                                 
  // Overlay score delta: "Adding 'TypeScript' and 'REST API' added +8 points"                                                                                                                              
                                                                                                                                                                                                            
  ---                                                                                                                                                                                                       
  12. PDF Export of Rewritten Resume                                                                                                                                                                        
                                                            
  Why it matters: Right now the rewritten resume arrives by email as a plain <pre> block. Users need a download-ready, beautifully formatted PDF.
                                                                                                                                                                                                            
  Tech: @react-pdf/renderer (frontend) or puppeteer (backend)                                                                                                                                               
                                                                                                                                                                                                            
  // src/services/resume/pdfExport.service.ts                                                                                                                                                               
  import puppeteer from 'puppeteer';                        

  export const generateResumePDF = async (rewrittenText: string, userName: string) => {                                                                                                                     
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();                                                                                                                                                                   
                                                                                                                                                                                                            
    // Render a clean HTML template
    await page.setContent(buildResumeHTML(rewrittenText, userName));                                                                                                                                        
                                                                                                                                                                                                            
    const pdf = await page.pdf({
      format: 'A4',                                                                                                                                                                                         
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,                                                                                                                                                                                
    });
                                                                                                                                                                                                            
    await browser.close();                                  
    return pdf; // Buffer — can be returned as download or attached to email
  };                                                                                                                                                                                                        
   
  ---                                                                                                                                                                                                       
  13. AI Chat Assistant (Context-Aware Resume Q&A)          
                                                                                                                                                                                                            
  Why it matters: This is a 2026 differentiator. "Ask AI" about any part of the resume in a chat interface: "How do I improve my skills section for a DevOps role?" — the AI has full context of their
  resume and the JD.                                                                                                                                                                                        
                                                            
  Tech: Gemini chat API (startChat) + Zustand chat store + streaming                                                                                                                                        
                                                            
  // src/services/ai/gemini.service.ts                                                                                                                                                                      
  export const startResumeChat = async (resumeText: string, analysisResult: AnalysisResult) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });                                                                                                                                  
                                                                                                                                                                                                            
    const systemContext = `You are an expert resume coach. You have access to the candidate's resume                                                                                                        
  and their ATS analysis results. Help them improve their resume specifically.                                                                                                                              
                                                                                                                                                                                                            
  RESUME: ${resumeText}                                     
  ATS SCORE: ${analysisResult.score}/100                                                                                                                                                                    
  MISSING KEYWORDS: ${analysisResult.missingKeywords.join(', ')}                                                                                                                                            
  DOMAIN: ${analysisResult.domain}
                                                                                                                                                                                                            
  Answer questions specifically about THIS resume. Give concrete, actionable advice.`;
                                                                                                                                                                                                            
    return model.startChat({                                                                                                                                                                                
      history: [{ role: 'user', parts: [{ text: systemContext }] }],                                                                                                                                        
      generationConfig: { maxOutputTokens: 1000 },                                                                                                                                                          
    });                                                                                                                                                                                                     
  };
                                                                                                                                                                                                            
  // Stream the response token by token                     
  const stream = await chat.sendMessageStream(userMessage);
  for await (const chunk of stream) {                                                                                                                                                                       
    res.write(chunk.text());
  }                                                                                                                                                                                                         
                                                            
  ---
  🟢 OPTIONAL — Phase 3–4 (Production Polish)

  ---
  14. Docker + Docker Compose

  Tech: Multi-stage Dockerfile for lean production images

  # backend/Dockerfile
  FROM node:20-alpine AS base
  WORKDIR /app

  FROM base AS deps
  COPY package*.json ./
  RUN npm ci --only=production

  FROM base AS builder
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  FROM base AS runner
  ENV NODE_ENV=production
  COPY --from=deps /app/node_modules ./node_modules
  COPY --from=builder /app/dist ./dist
  COPY prisma ./prisma                                                                                                                                                                                      
  EXPOSE 5000
  CMD ["node", "dist/server.js"]                                                                                                                                                                            
                                                            
  # docker-compose.yml                                                                                                                                                                                      
  version: '3.9'
                                                                                                                                                                                                            
  services:                                                 
    postgres:
      image: postgres:16-alpine
      environment:
        POSTGRES_DB: ats_analyzer
        POSTGRES_USER: ${DB_USER}
        POSTGRES_PASSWORD: ${DB_PASSWORD}                                                                                                                                                                   
      volumes:
        - postgres_data:/var/lib/postgresql/data                                                                                                                                                            
      healthcheck:                                          
        test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]                                                                                                                                                     
        interval: 5s
                                                                                                                                                                                                            
    redis:                                                  
      image: redis:7-alpine
      command: redis-server --requirepass ${REDIS_PASSWORD}
      volumes:                                                                                                                                                                                              
        - redis_data:/data
                                                                                                                                                                                                            
    backend:                                                
      build: ./backend
      depends_on:
        postgres: { condition: service_healthy }
        redis:    { condition: service_started }                                                                                                                                                            
      environment:
        DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/ats_analyzer                                                                                                                     
        REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379                                                                                                                                                    
      ports: ["5000:5000"]
                                                                                                                                                                                                            
    frontend:                                               
      build: ./frontend
      environment:                                                                                                                                                                                          
        NEXT_PUBLIC_API_URL: http://backend:5000
      ports: ["3000:3000"]                                                                                                                                                                                  
                                                            
  volumes:
    postgres_data:
    redis_data:                                                                                                                                                                                             
   
  ---                                                                                                                                                                                                       
  15. GitHub Actions CI/CD                                  

  # .github/workflows/ci.yml
  name: CI
  on: [push, pull_request]                                                                                                                                                                                  
   
  jobs:                                                                                                                                                                                                     
    backend:                                                
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:16
          env: { POSTGRES_PASSWORD: test, POSTGRES_DB: ats_test }
          options: --health-cmd pg_isready                                                                                                                                                                  
        redis:                                                                                                                                                                                              
          image: redis:7                                                                                                                                                                                    
          options: --health-cmd "redis-cli ping"                                                                                                                                                            
      steps:                                                
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4                                                                                                                                                                       
          with: { node-version: '20', cache: 'npm' }
        - run: npm ci                                                                                                                                                                                       
          working-directory: backend                        
        - run: npm run typecheck                                                                                                                                                                            
          working-directory: backend
        - run: npm run lint                                                                                                                                                                                 
          working-directory: backend                        
        - run: npx prisma migrate deploy
          working-directory: backend                                                                                                                                                                        
          env: { DATABASE_URL: postgresql://postgres:test@localhost:5432/ats_test }
        - run: npm test                                                                                                                                                                                     
          working-directory: backend                                                                                                                                                                        
   
    frontend:                                                                                                                                                                                               
      runs-on: ubuntu-latest                                
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20', cache: 'npm' }
        - run: npm ci && npm run build                                                                                                                                                                      
          working-directory: frontend
                                                                                                                                                                                                            
  ---                                                       
  16. Request Tracing + Sentry Error Monitoring
                                                                                                                                                                                                            
  // src/middleware/requestLogger.middleware.ts
  import { v4 as uuid } from 'uuid';                                                                                                                                                                        
  import { logger } from '../lib/logger';                   
                                                                                                                                                                                                            
  export const requestLogger = (req, res, next) => {                                                                                                                                                        
    req.id = uuid();
    res.setHeader('X-Request-Id', req.id);                                                                                                                                                                  
                                                            
    const start = Date.now();                                                                                                                                                                               
    res.on('finish', () => {
      logger.info({                                                                                                                                                                                         
        requestId: req.id,                                  
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,                                                                                                                                                                         
        durationMs: Date.now() - start,
        ip: req.ip,                                                                                                                                                                                         
        userAgent: req.headers['user-agent'],               
      });
    });                                                                                                                                                                                                     
    next();
  };                                                                                                                                                                                                        
                                                            
  // Sentry integration:
  import * as Sentry from '@sentry/node';
  Sentry.init({ dsn: env.SENTRY_DSN, tracesSampleRate: 0.1 });                                                                                                                                              
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler()); // before your custom errorHandler                                                                                                                               
                                                                                                                                                                                                            
  ---                                                                                                                                                                                                       
  17. Frontend: Zustand State + Typed API Client                                                                                                                                                            
                                                                                                                                                                                                            
  // src/lib/api.ts — typed, centralized API client
  import ky from 'ky';                                                                                                                                                                                      
                                                                                                                                                                                                            
  const api = ky.create({
    prefixUrl: process.env.NEXT_PUBLIC_API_URL,                                                                                                                                                             
    credentials: 'include',                                 
    hooks: {                                                                                                                                                                                                
      beforeRequest: [
        request => {                                                                                                                                                                                        
          // attach auth token from cookie session automatically
        }                                                                                                                                                                                                   
      ],
      afterResponse: [                                                                                                                                                                                      
        async (request, options, response) => {             
          if (!response.ok) {                                                                                                                                                                               
            const error = await response.json();
            throw new ApiError(error.error.message, response.status);                                                                                                                                       
          }                                                 
        }                                                                                                                                                                                                   
      ],                                                    
    },
  });

  export const resumeApi = {                                                                                                                                                                                
    upload: (formData: FormData) =>
      api.post('api/v1/resume/upload', { body: formData }).json<UploadResponse>(),                                                                                                                          
                                                                                                                                                                                                            
    getJobStatus: (jobId: string) =>
      api.get(`api/v1/jobs/${jobId}`).json<JobStatus>(),                                                                                                                                                    
                                                                                                                                                                                                            
    getAnalysisHistory: () =>
      api.get('api/v1/analyses').json<Analysis[]>(),                                                                                                                                                        
                                                            
    compareAnalyses: (ids: string[]) =>                                                                                                                                                                     
      api.get('api/v1/analyses/compare', { searchParams: { ids } }).json<ComparisonResult>(),
  };                                                                                                                                                                                                        
                                                            
  // src/stores/analysisStore.ts                                                                                                                                                                            
  import { create } from 'zustand';                         
  import { devtools, persist } from 'zustand/middleware';

  interface AnalysisStore {
    currentJobId: string | null;
    currentAnalysis: Analysis | null;                                                                                                                                                                       
    history: Analysis[];
    mode: 'analyze' | 'rewrite';                                                                                                                                                                            
    setMode: (m: 'analyze' | 'rewrite') => void;            
    setJobId: (id: string) => void;                                                                                                                                                                         
    setAnalysis: (a: Analysis) => void;
    reset: () => void;                                                                                                                                                                                      
  }                                                         
                                                                                                                                                                                                            
  export const useAnalysisStore = create<AnalysisStore>()(
    devtools(                                                                                                                                                                                               
      persist(                                              
        (set) => ({
          currentJobId: null,
          currentAnalysis: null,
          history: [],
          mode: 'analyze',                                                                                                                                                                                  
          setMode: (mode) => set({ mode }),
          setJobId: (id) => set({ currentJobId: id }),                                                                                                                                                      
          setAnalysis: (a) => set(s => ({ currentAnalysis: a, history: [a, ...s.history].slice(0, 50) })),
          reset: () => set({ currentJobId: null, currentAnalysis: null }),                                                                                                                                  
        }),
        { name: 'ats-analysis', partialize: (s) => ({ history: s.history }) },                                                                                                                              
      ),                                                                                                                                                                                                    
    ),
  );                                                                                                                                                                                                        
                                                            
  ---
  18. API Versioning + Typed Request Validation (Zod)
                                                                                                                                                                                                            
  // src/api/v1/routes/resume.routes.ts
  import { z } from 'zod';                                                                                                                                                                                  
                                                                                                                                                                                                            
  const uploadSchema = z.object({
    name:           z.string().min(2).max(100),                                                                                                                                                             
    email:          z.string().email(),                     
    domain:         z.enum(['node.js', 'react', 'python', 'devops', ...]),                                                                                                                                  
    mode:           z.enum(['analyze', 'rewrite']).default('analyze'),                                                                                                                                      
    jobDescription: z.string().min(50).max(10000).optional(),                                                                                                                                               
  }).refine(                                                                                                                                                                                                
    (d) => d.mode === 'analyze' || !!d.jobDescription,      
    { message: 'jobDescription required in rewrite mode', path: ['jobDescription'] }                                                                                                                        
  );                                                                                                                                                                                                        
   
  router.post(                                                                                                                                                                                              
    '/upload',                                              
    uploadLimiter,
    authMiddleware.optional,                                                                                                                                                                                
    validateBody(uploadSchema),  // middleware wrapping zod.parse
    resumeController.upload,                                                                                                                                                                                
  );                                                        
                                                                                                                                                                                                            
  ---                                                       
  19. Improve AI Prompt Engineering (Chain-of-Thought + Structured Output)
                                                                                                                                                                                                            
  Current prompt weakness: Single-shot, no structure, no examples, no reasoning chain.
                                                                                                                                                                                                            
  Production-grade approach:                                
                                                                                                                                                                                                            
  // src/services/ai/prompts/rewrite.prompt.ts              
  export const buildRewritePrompt = (resume: string, jd: string, analysis: AnalysisResult) => `
  <system>                                                                                                                                                                                                  
  You are a FAANG-level resume coach and ATS optimization specialist.
  You have already analyzed this resume and know exactly what is missing.                                                                                                                                   
  </system>                                                 
                                                                                                                                                                                                            
                                                            
  <task>                                                                                                                                                                                                    
  Rewrite the resume below to achieve an ATS score above 85/100 for the job description provided.
                                                                                                                                                                                                            
  Step 1: Identify the top 10 keywords from the JD that are missing from the resume.
  Step 2: For each experience bullet, determine if a JD keyword can be truthfully incorporated.                                                                                                             
  Step 3: Rewrite each bullet starting with a strong action verb, incorporating 1-2 keywords.                                                                                                               
  Step 4: Rewrite the professional summary to mirror the JD's language exactly.                                                                                                                             
  Step 5: Ensure the skills section contains all critical keywords from the JD.                                                                                                                             
  </task>                                                                                                                                                                                                   
                                                                                                                                                                                                            
  <constraints>                                                                                                                                                                                             
  - Do NOT fabricate experience, certifications, or companies
  - Use plain text only — no markdown, no tables, no bullets with • or * symbols                                                                                                                            
  - Use standard section headers: PROFESSIONAL SUMMARY, EXPERIENCE, EDUCATION, SKILLS                                                                                                                       
  - Maximum bullet length: 2 lines                                                                                                                                                                          
  - Include at least 3 quantified achievements (%, $, numbers)                                                                                                                                              
  </constraints>                                                                                                                                                                                            
                                                                                                                                                                                                            
  <resume>${resume}</resume>                                
  <job_description>${jd}</job_description>                                                                                                                                                                  
  
  Output the complete rewritten resume only. No commentary.                                                                                                                                                 
  `;                                                                                                                                                                                                        
  
  ---                                                                                                                                                                                                       
  Section 4: Implementation Roadmap                         
                                   
  Phase 1 — Critical Foundation (Week 1–2)
                                                                                                                                                                                                            
  Goal: Make it production-worthy, not just a demo.                                                                                                                                                         
                                                                                                                                                                                                            
  ┌─────┬─────────────────────────────────────────────────┬──────────────────────────────────────┬────────┬──────────┐                                                                                      
  │  #  │                      Task                       │               Packages               │ Effort │  Impact  │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 1   │ Migrate backend to TypeScript                   │ typescript, ts-node, tsx             │ 4h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 2   │ Zod env validation                              │ zod                                  │ 1h     │ High     │                                                                                      
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤
  │ 3   │ Custom error classes + error handler middleware │ —                                    │ 2h     │ High     │                                                                                      
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 4   │ Winston structured logging + request tracer     │ winston, uuid                        │ 2h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 5   │ PostgreSQL + Prisma setup                       │ prisma, PostgreSQL                   │ 4h     │ Critical │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 6   │ API versioning (/api/v1/)                       │ —                                    │ 1h     │ Medium   │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 7   │ Zod request validation middleware               │ zod                                  │ 2h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 8   │ Rate limiting with Redis store                  │ express-rate-limit, rate-limit-redis │ 2h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 9   │ Helmet + CORS lockdown                          │ helmet                               │ 1h     │ High     │
  ├─────┼─────────────────────────────────────────────────┼──────────────────────────────────────┼────────┼──────────┤                                                                                      
  │ 10  │ Add start + dev + typecheck scripts             │ tsx, nodemon                         │ 30m    │ Medium   │
  └─────┴─────────────────────────────────────────────────┴──────────────────────────────────────┴────────┴──────────┘                                                                                      
                                                            
  Deliverable: A backend that won't embarrass you in a code review.                                                                                                                                         
                                                            
  ---                                                                                                                                                                                                       
  Phase 2 — AI & Feature Enhancements (Week 3–4)            
                                                                                                                                                                                                            
  Goal: Turn it into something genuinely impressive.
                                                                                                                                                                                                            
  ┌─────┬───────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────┬────────┬──────────┐
  │  #  │                                     Task                                      │             Packages             │ Effort │  Impact  │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 1   │ BullMQ + Redis job queue for async processing                                 │ bullmq, ioredis                  │ 6h     │ Critical │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 2   │ SSE real-time progress updates                                                │ —                                │ 3h     │ High     │                                                            
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤
  │ 3   │ Enhanced ATS scoring (formatting checks, section detection, missing keywords) │ —                                │ 4h     │ High     │                                                            
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 4   │ AI keyword gap analysis (structured JSON output from Gemini)                  │ —                                │ 3h     │ High     │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 5   │ Improve AI prompts (CoT, constraints, structured output)                      │ —                                │ 2h     │ High     │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 6   │ Auth.js + Google OAuth                                                        │ next-auth, @auth/prisma-adapter  │ 5h     │ High     │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 7   │ User dashboard + analysis history                                             │ recharts                         │ 6h     │ High     │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 8   │ PDF export of rewritten resume                                                │ puppeteer or @react-pdf/renderer │ 4h     │ Medium   │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 9   │ Zustand state store + typed API client                                        │ zustand, ky                      │ 3h     │ Medium   │
  ├─────┼───────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┼────────┼──────────┤                                                            
  │ 10  │ Split UploadSection into 5 focused components                                 │ —                                │ 2h     │ Medium   │
  └─────┴───────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────┴────────┴──────────┘                                                            
                                                            
  Deliverable: Something you'd genuinely demo to a hiring manager.                                                                                                                                          
                                                            
  ---                                                                                                                                                                                                       
  Phase 3 — SaaS Scalability (Week 5–6)                     

  Goal: Show you understand production systems.

  ┌─────┬─────────────────────────────────────────────────────┬───────────────────┬────────┬────────┐                                                                                                       
  │  #  │                        Task                         │     Packages      │ Effort │ Impact │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 1   │ Docker + Docker Compose (all services)              │ docker            │ 4h     │ High   │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤
  │ 2   │ GitHub Actions CI (typecheck + lint + test + build) │ —                 │ 3h     │ High   │                                                                                                       
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 3   │ Unit tests for analyzer + AI services               │ vitest, supertest │ 6h     │ High   │                                                                                                       
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 4   │ Resume versioning + side-by-side comparison         │ diff-match-patch  │ 4h     │ Medium │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 5   │ AI chat assistant (Gemini chat API + streaming)     │ —                 │ 5h     │ Medium │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 6   │ Redis response caching for analysis results         │ ioredis           │ 2h     │ Medium │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 7   │ Sentry error monitoring                             │ @sentry/node      │ 2h     │ Medium │
  ├─────┼─────────────────────────────────────────────────────┼───────────────────┼────────┼────────┤                                                                                                       
  │ 8   │ Expand keywords.json to 25+ domains                 │ —                 │ 4h     │ Medium │
  └─────┴─────────────────────────────────────────────────────┴───────────────────┴────────┴────────┘                                                                                                       
                                                            
  Deliverable: A GitHub repo a senior engineer can clone and run with docker compose up.                                                                                                                    
   
  ---                                                                                                                                                                                                       
  Phase 4 — Enterprise Polish (Week 7–8)                    
                                                                                                                                                                                                            
  Goal: Recruiter-wow finishing touches.
                                                                                                                                                                                                            
  ┌─────┬──────────────────────────────────────────────────┬─────────────────────────┬──────────┐                                                                                                           
  │  #  │                       Task                       │        Packages         │  Impact  │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 1   │ Score trend chart with Recharts on dashboard     │ recharts                │ High     │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤
  │ 2   │ LinkedIn Job URL auto-fetch (scrape JD from URL) │ cheerio                 │ High     │                                                                                                           
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 3   │ Multiple resume templates for PDF export         │ —                       │ Medium   │                                                                                                           
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 4   │ Admin panel: all submissions, usage analytics    │ —                       │ Medium   │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 5   │ OpenTelemetry tracing                            │ @opentelemetry/sdk-node │ Medium   │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 6   │ Webhook support (Zapier/Make integration)        │ —                       │ Optional │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 7   │ Free tier limits + premium gate (Stripe ready)   │ stripe                  │ Optional │
  ├─────┼──────────────────────────────────────────────────┼─────────────────────────┼──────────┤                                                                                                           
  │ 8   │ Playwright E2E tests for critical flows          │ playwright              │ Medium   │
  └─────┴──────────────────────────────────────────────────┴─────────────────────────┴──────────┘                                                                                                           
                                                            
  ---                                                                                                                                                                                                       
  Section 5: Quick Wins You Can Ship Today                  
                                          
  These require 30–60 minutes each and immediately improve code quality:
                                                                                                                                                                                                            
  // 1. Add start script to backend/package.json
  "scripts": {                                                                                                                                                                                              
    "start": "node dist/server.js",                         
    "dev": "tsx watch src/server.ts",                                                                                                                                                                       
    "build": "tsc",                                                                                                                                                                                         
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",                                                                                                                                                                                  
    "test": "vitest"                                        
  }                                                                                                                                                                                                         
  
  // 2. Fix: CORS is wide open                                                                                                                                                                              
  // Change: app.use(cors())                                
  // To:                                                                                                                                                                                                    
  app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
                                                                                                                                                                                                            
  // 3. Fix: hardcoded localhost in frontend                                                                                                                                                                
  // Change: fetch('http://localhost:5000/api/upload', ...)
  // To:                                                                                                                                                                                                    
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  fetch(`${API_URL}/api/upload`, ...)                                                                                                                                                                       
  
  // 4. Fix: no retry on Gemini calls                                                                                                                                                                       
  const result = await retry(                               
    () => model.generateContent(prompt),                                                                                                                                                                    
    { retries: 3, factor: 2, minTimeout: 1000 }                                                                                                                                                             
  );  // use 'async-retry' package
                                                                                                                                                                                                            
  // 5. Fix: email sent synchronously (wrap in setImmediate or queue)                                                                                                                                       
  // Don't await email in the response path:                                                                                                                                                                
  setImmediate(() => emailService.send(...));  // fire-and-forget                                                                                                                                           
  // Or better: add to BullMQ queue                                                                                                                                                                         
                                                                                                                                                                                                            
  // 6. Add .env.example to the repo (remove actual secrets from README)                                                                                                                                    
  // 7. Add .gitignore entry for *.log, uploads/, dist/     
                                                                                                                                                                                                            
  ---                                                       
  Final Assessment                                                                                                                                                                                          
                                                                                                                                                                                                            
  ┌──────────────────────────┬─────────┬───────────────┬───────────────┬───────────────┐
  │         Category         │ Current │ After Phase 1 │ After Phase 2 │ After Phase 4 │                                                                                                                    
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤
  │ Architecture             │ 3/10    │ 7/10          │ 8/10          │ 9/10          │                                                                                                                    
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤
  │ AI Depth                 │ 5/10    │ 5/10          │ 8/10          │ 9/10          │                                                                                                                    
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤                                                                                                                    
  │ Production Readiness     │ 2/10    │ 7/10          │ 8/10          │ 9/10          │                                                                                                                    
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤                                                                                                                    
  │ Security                 │ 2/10    │ 8/10          │ 8/10          │ 9/10          │
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤                                                                                                                    
  │ Scalability              │ 1/10    │ 5/10          │ 8/10          │ 9/10          │
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤                                                                                                                    
  │ Portfolio Impressiveness │ 5/10    │ 6/10          │ 8/10          │ 10/10         │
  └──────────────────────────┴─────────┴───────────────┴───────────────┴───────────────┘                                                                                                                    
   
  Interview talking points this unlocks after Phase 2:                                                                                                                                                      
  - "I implemented BullMQ with Redis for async AI processing — here's why I chose SSE over WebSockets for progress streaming"
  - "The scoring engine detects ATS formatting failures like table usage and missing quantified achievements"                                                                                               
  - "I used Gemini's structured JSON output mode with Zod schema validation to ensure reliable AI responses" 
  - "I designed the Prisma schema with composite indexes on (userId, createdAt) to support efficient dashboard pagination"                                                                                  
                                                                                                                                                                                                            
  That's the difference between a portfolio project and a product engineering interview.                                                                                                                    
                                                                                                                                                                                                            
✻ Cogitated for 3m 51s                                                                                                                                       │ 1/10    │ 5/10          │ 8/10          │ 9/10          │
  ├──────────────────────────┼─────────┼───────────────┼───────────────┼───────────────┤                                                                                                                    
  │ Portfolio Impressiveness │ 5/10    │ 6/10          │ 8/10          │ 10/10         │
  └──────────────────────────┴─────────┴───────────────┴───────────────┴───────────────┘                                                                                                                    
   
  Interview talking points this unlocks after Phase 2:                                                                                                                                                      
  - "I implemented BullMQ with Redis for async AI processing — here's why I chose SSE over WebSockets for progress streaming"
  - "The scoring engine detects ATS formatting failures like table usage and missing quantified achievements"                                                                                               
  - "I used Gemini's structured JSON output mode with Zod schema validation to ensure reliable AI responses" 
  - "I designed the Prisma schema with composite indexes on (userId, createdAt) to support efficient dashboard pagination"                                                                                  
                                                                                                                                                                                                            
  That's the difference between a portfolio project and a product engineering interview.                                                                                                                    
                                                                                                                                                                                                            
✻ Cogitated for 3m 51s                                                                                                                         