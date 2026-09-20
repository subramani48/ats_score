# ATS Resume Analyzer

A web application that scores a resume the way company hiring software (an ATS) would, then helps the job seeker improve it and prepare for interviews with Google Gemini.

- **Backend:** NestJS 10, Prisma 7 with PostgreSQL, Google Gemini (`@google/generative-ai`)
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS
- **Language:** TypeScript throughout

> The project folder is named `ATS score ` (with a trailing space). Quote the path in shell commands.

## Features

**Resume analysis**
- Upload a PDF or DOCX and get a rule-based ATS score with a breakdown, matched and missing keywords, warnings and suggestions. Progress is streamed live.
- Optional job description: AI keyword-gap analysis, or a full AI rewrite of the resume for that job.
- Chat with an AI coach about a saved analysis.
- Analysis history, analytics and score trends, resume version snapshots and comparison, peer benchmark.
- Import a job description from a URL on several pages. A LinkedIn profile import exists in the API; the website does not show it yet. (Server-side fetching is restricted to public web pages.)

**Job-search tools**
- Cover letter generator, older interview-question generator, company-specific ATS check, batch analysis of several job descriptions.

**Interview Pro**
- Mock interview with adaptive questions, scoring and a final report (typed or spoken answers).
- STAR story bank generated from a resume, with matching to interview questions.
- Company battle card, and an application tracker with follow-up email drafts.

**Accounts and administration**
- Email and password sign-up (JWT), free / pro / enterprise plan limits, in-app notifications, API-key management, admin statistics.

## Repository layout

```
.github/workflows/ci.yml     CI: install, Prisma client, type-check, tests, build (backend); lint, type-check, build (frontend)
docker-compose.yml           PostgreSQL + backend + frontend
ATS score /
  backend/                   NestJS API
    src/modules/             one folder per feature (controller, service, dto, module)
    src/common/              shared guards, filters, interceptors, safe HTTP fetch, AI-output helpers
    src/__tests__/           Jest tests
    prisma/                  schema and demo-data seed
  frontend/                  Next.js website (src/app = pages, src/lib/api.ts = API client)
```

## Getting started (local development)

Requirements: Node.js 20, PostgreSQL, and a Google Gemini API key.

```bash
# 1. Backend
cd "ATS score /backend"
cp .env.example .env          # then fill in the values (see the table below); never commit .env
npm install
npm run db:generate           # generate the Prisma client
npm run db:push               # create the tables in your database
npm run start:dev             # API on http://localhost:5000  (health check: /health)

# 2. Frontend (second terminal)
cd "ATS score /frontend"
npm install
npm run dev                   # website on http://localhost:3000
```

The website talks to the API at `NEXT_PUBLIC_API_URL` (default `http://localhost:5000`). Optional demo accounts: `npm run db:seed` in `backend/` (local databases only; it refuses to run in production or against a remote database).

## Configuration

Set in `backend/.env` (see `backend/.env.example`). The server validates these at startup and stops with a clear message if a required one is missing.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `GEMINI_API_KEY` | yes | Google Gemini API key |
| `JWT_SECRET` | yes | Signs login tokens. At least 16 characters, must not be the placeholder from `.env.example`; there is no fallback value |
| `SMTP_USER`, `SMTP_PASS` | yes | Mail account used to email analysis reports (`SMTP_HOST` default `smtp.gmail.com`, `SMTP_PORT` default `587`) |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `7d` |
| `GEMINI_MODEL` | no | Model for every AI feature, default `gemini-2.5-flash` |
| `GEMINI_TIMEOUT_MS` | no | Longest wait for one AI call (1,000 to 300,000), default `90000` |
| `FRONTEND_URL` | no | Allowed browser origin (CORS), default `http://localhost:3000` |
| `PORT` | no | API port, default `5000` |
| `MAX_FILE_SIZE_MB` | no | Resume upload limit, default `5` |
| `TRUST_PROXY_HOPS` | no | Number of proxies in front of the API, so rate limits see real visitor addresses. Default `0` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` | no | If both are set, every uploaded resume is also forwarded to that Telegram chat. **Leave empty unless users have agreed to this** |
| `OTEL_ENABLED`, `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_JAEGER_ENDPOINT` | no | Tracing to Jaeger. On unless `OTEL_ENABLED=false` |
| `SEED_PASSWORD`, `SEED_ALLOW_REMOTE` | no | Demo-data seed only |

Frontend: `NEXT_PUBLIC_API_URL` (the API address; set it for anything other than local development).

## Scripts

| Where | Command | What it does |
|---|---|---|
| backend | `npm run start:dev` / `npm run build` / `npm run start:prod` | develop, compile, run the compiled server |
| backend | `npm test` / `npm run typecheck` | Jest tests / TypeScript check |
| backend | `npm run db:generate` / `db:push` / `db:studio` / `db:seed` | Prisma client / create tables / browse data / demo data |
| frontend | `npm run dev` / `npm run build` / `npm start` | develop, build, serve the build |
| frontend | `npm run lint` / `npm run typecheck` | ESLint / TypeScript check |

## Docker

```bash
# from the repository root; set DB_PASSWORD, GEMINI_API_KEY, JWT_SECRET, SMTP_* in your environment first
docker compose up --build
```

`docker-compose.yml` requires `DB_PASSWORD` (it has no default). The website's API address is a build argument (`NEXT_PUBLIC_API_URL`, default `http://localhost:5000`) because Next.js bakes it in at build time. The frontend image uses Next.js standalone output, switched on by `NEXT_STANDALONE=true` in its Dockerfile.

## Security and reliability

- Login is required for the AI features and for anyone's saved data (the resume upload and its progress stream stay open to signed-out visitors). Analyses and versions are readable only by their owner; the admin area needs the `admin` role.
- Rate limits: 100 requests per 15 minutes per address overall, with stricter limits on login (10 per 15 minutes), sign-up (5 per hour), uploads, batch and the AI routes.
- Everything a user types or uploads is wrapped as untrusted data in AI prompts. Every AI call has a time limit, quota (429) and permanent errors are not retried, and users see only generic error messages. A rewritten resume is rejected if it claims a technology the original does not contain.
- Job-description and LinkedIn fetching blocks internal and private network addresses.
- Secrets live only in environment variables. `.env` files, `node_modules` and build output are git-ignored.

## Known limitations

- **API keys** can be created and revoked, but no route accepts one for authentication yet.
- **Language switcher** stores the chosen language, but the pages are not translated (`frontend/src/i18n/messages` holds unused draft texts).
- **Background jobs run in memory**: a server restart loses running analyses, and only one server instance is supported.
- **Payments do not exist**: the plan-upgrade route always refuses.
- Signed-out visitors can upload without logging in, so plan limits apply only to logged-in users.
- Gemini's free tier allows very few requests per day; a paid key is needed for real use.
