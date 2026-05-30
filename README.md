# ATS Resume Analyzer & AI Optimizer

An enterprise-grade, full-stack **Applicant Tracking System (ATS) Resume Analyzer** and **AI Optimizer**. Candidates can upload their resume (PDF/DOCX), select their target job domain, and receive an instant compatibility score, detailed format checks, missing keywords analysis, and actionable feedback.

The application also features an **AI Rewrite mode** that reframes experience and objective summaries to align with any job description, sending the finished output via email.

---

## Features

- **📊 Deep ATS Scoring & Breakdown:** Evaluates resumes on formatting, readability, keywords density, and metrics-driven achievements.
- **⚡ Real-time Progress Streaming:** Uses NestJS Server-Sent Events (SSE) backed by BullMQ and Redis to stream parsing and analysis states to the client.
- **🤖 Dual-AI Engine support:** Supports **Google Gemini (1.5 Flash/Pro)** or local offline LLMs using **Ollama** (e.g., Llama 3, Gemma 2).
- **📝 AI Resume Rewriter:** Automatically tailrows and reframes the candidate's resume to match a specific job description (sends rewritten text via email).
- **📬 Email & Admin Notifications:**
  - Automatically sends beautiful HTML reports and rewritten resumes to candidates via SMTP (Nodemailer).
  - Admin notification forwards the candidate's **actual PDF resume document** and metadata directly to a Telegram Channel/Group using a Telegram Bot.
- **🔄 Resume Version Control:** Create snapshot versions, labels, and compare scores of different resume iterations in a central dashboard.
- **🔑 Developer API Keys:** Generate and manage keys to access the analyzer and cover-letter generators programmatically.
- **🎨 Sleek Modern UI:** Fully responsive frontend built with React, Next.js, TailwindCSS, and Framer Motion supporting interactive stats gauges, skill graphs, and glassmorphism.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router, Turbopack)
- **Styling:** Tailwind CSS & Framer Motion
- **State Management:** Zustand
- **Icons:** Lucide React

### Backend
- **Framework:** NestJS (Node.js)
- **ORM:** Prisma ORM
- **Database:** PostgreSQL
- **Queue & Real-time:** BullMQ & Redis
- **Authentication:** Passport.js (JWT)
- **Email:** Nodemailer (SMTP)
- **HTTP Client:** Axios & Native Web Fetch

---

## ⚙️ Environment Variables

### Backend Configuration (`/backend/.env`)

```env
# Server
PORT=5000
NODE_ENV=development

# Database & Cache
DATABASE_URL=postgresql://user:password@localhost:5432/ats_score_db
REDIS_URL=redis://localhost:6379

# AI Configurations
LLM_PROVIDER=gemini # Choose: 'gemini' or 'ollama'
GEMINI_API_KEY=your_gemini_api_key

# Optional: Ollama settings
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma2

# SMTP Configuration (Gmail App Password etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Telegram Bot Integration
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_chat_id

# JWT Authentication
JWT_SECRET=ats-analyzer-super-secret-jwt-key
