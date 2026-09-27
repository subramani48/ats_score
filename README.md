# ATS Resume Analyzer

A web application that scores a resume the way company hiring software (an ATS) would, then helps the job seeker improve it and prepare for interviews with Google Gemini.

- **Backend:** NestJS 10, Prisma 7 with PostgreSQL, Google Gemini (`@google/generative-ai`)
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS
- **Language:** TypeScript throughout

## Project status (updated 2026-09-27)

**Done and pushed to `version.1.0`:** everything under Features below, including the five items that used to be listed as limitations: API-key login, LinkedIn import on the website, analysis jobs kept in the database, admin-set plans (no online payments, by choice), and English / Tamil / Hindi translations. The project folder was renamed from `ATS score ` to `ATS_score` so the repository clones on Windows.

**Checked:** backend type-check and 494 Jest tests pass; frontend type-check, lint and production build pass.

**Not yet verified:**
- The app has never been run end to end: no real database, Gemini key or SMTP account has been connected yet.
- The database job queue (`AnalysisJob` table) is tested only against an in-memory stand-in, not real PostgreSQL.
- The language switcher has not been clicked through in a browser.
- CI has not been confirmed green since the folder rename.

**Next step:** fill in `ATS_score/backend/.env` (see Configuration), then `npm run db:generate`, `npm run db:push` (the schema changed: new `AnalysisJob` table, `ApiKey` now stores `keyHash`/`keyLast8`), start both apps and test each feature. Node.js must be 20.19+ or 22.12+ (Prisma 7 fails to install on older 20.x).

## For AI agents: "follow the README"

If you were pointed at this file, do this, in order:

1. **Read first, change nothing.** Read this whole README, then tell the user in a few lines where the project stands (use Project status above) and what you suggest doing next.
2. **Ask before acting.** Get the user's explicit OK before any of these, one at a time:
   - running install, build, database or start commands (`npm install`, `db:push`, `db:migrate`, `db:seed`, `start:dev`, `docker compose up`);
   - creating or changing `.env`: never overwrite an existing one, and never copy `.env.example` over it;
   - any git commit, push, branch change, reset or force operation;
   - editing code, or anything that sends data outside the machine (emails, Telegram forwarding, API calls with real keys).
3. **Secrets stay out of chat.** Never ask the user to paste passwords or API keys into the conversation. Ask them to put the values into `ATS_score/backend/.env` themselves, then check only that the variables are set.
4. **Report honestly.** Say what you ran and what happened, including failures. Update Project status above when something changes, and ask before pushing that update.

## Features

**Resume analysis**
- Upload a PDF or DOCX and get a rule-based ATS score with a breakdown, matched and missing keywords, warnings and suggestions. Progress is streamed live.
- Optional job description: AI keyword-gap analysis, or a full AI rewrite of the resume for that job.
- Chat with an AI coach about a saved analysis.
- Analysis history, analytics and score trends, resume version snapshots and comparison, peer benchmark.
- Import a job description from a URL on several pages, and fill any resume box from your LinkedIn profile ("Import from LinkedIn" under the box; pasting the profile text works best, since LinkedIn usually blocks fetching a profile link). (Server-side fetching is restricted to public web pages.)

**Job-search tools**
- Cover letter generator, older interview-question generator, company-specific ATS check, batch analysis of several job descriptions.

**Interview Pro**
- Mock interview with adaptive questions, scoring and a final report (typed or spoken answers).
- STAR story bank generated from a resume, with matching to interview questions.
- Company battle card, and an application tracker with follow-up email drafts.

**Accounts and administration**
- Email and password sign-up (JWT), free / pro / enterprise plan limits, in-app notifications, admin statistics, and an admin user list where plans are changed.
- API keys for scripts and other apps: send `X-API-Key: ats_…` (or `Authorization: Bearer ats_…`) and the request acts as the key's owner. Keys are stored only as SHA-256 hashes, and they cannot manage other keys or open the admin area.

## Repository layout

```
.github/workflows/ci.yml     CI: install, Prisma client, type-check, tests, build (backend); lint, type-check, build (frontend)
docker-compose.yml           PostgreSQL + backend + frontend
ATS_score/  
  backend/                   NestJS API
    src/modules/             one folder per feature (controller, service, dto, module)
    src/common/              shared guards, filters, interceptors, safe HTTP fetch, AI-output helpers
    src/__tests__/           Jest tests
    prisma/                  schema and demo-data seed
  frontend/                  Next.js website (src/app = pages, src/lib/api.ts = API client)
```

## Getting started (local development)

Requirements: Node.js 20.19+ or 22.12+, PostgreSQL, and a Google Gemini API key.

```bash
# 1. Backend
cd ATS_score/backend
cp .env.example .env          # then fill in the values (see the table below); never commit .env
npm install
npm run db:generate           # generate the Prisma client
npm run db:push               # create the tables in your database
npm run start:dev             # API on http://localhost:5000  (health check: /health)

# 2. Frontend (second terminal)
cd ATS_score/frontend
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
- Resume analyses run as jobs saved in the database (`AnalysisJob` table), so a restart does not lose them and several server instances can share the work. A job whose server stops is picked up again after a minute (at most 3 runs); in that case the report email can arrive twice. The uploaded file is erased from the job when it ends, and finished jobs are deleted after 10 minutes.

## Known limitations

- The website is in English, Tamil and Hindi (language switcher on every page; texts in `frontend/src/i18n/messages`, where `en.ts` is the source and a missing key fails the type check). AI-written content (analyses, cover letters, questions), server error messages and the exported PDF stay in English.
- **No online payments**: users cannot upgrade themselves (the plan-upgrade route refuses). An admin changes a user's plan on the Admin page (Users table, or `PATCH /api/v1/admin/users/:id/tier`), and the user gets a notification.
- Signed-out visitors can upload without logging in, so plan limits apply only to logged-in users.
- Gemini's free tier allows very few requests per day; a paid key is needed for real use.
