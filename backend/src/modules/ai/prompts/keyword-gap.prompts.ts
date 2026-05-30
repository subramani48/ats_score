export const keywordGapPrompt = (resumeText: string, jd: string) => `
You are an ATS expert. Compare the resume against the job description.

Return ONLY valid JSON matching this exact schema — no markdown, no commentary:
{
  "criticalMissing": ["keywords that appear 2+ times in JD but not in resume"],
  "nicetohaveMissing": ["keywords that appear once in JD, not in resume"],
  "presentKeywords": ["keywords found in both resume and JD"],
  "keywordDensityIssues": ["keywords present in resume but underused"],
  "overusedPhrases": ["clichés or weak phrases that hurt the resume"],
  "recommendedAdditions": [
    { "keyword": "...", "where": "Skills section", "example": "example bullet point using this keyword" }
  ]
}

RESUME:
${resumeText}

JOB DESCRIPTION:
${jd}
`.trim();

export const analyzePrompt = (resumeText: string, domain: string) => `
You are an expert ATS resume reviewer specializing in ${domain} roles.

Analyze this resume and return ONLY valid JSON:
{
  "score": <number 0-100>,
  "breakdown": {
    "keywordScore": <0-40>,
    "achievementScore": <0-25>,
    "formattingScore": <0-20>,
    "readabilityScore": <0-15>
  },
  "matchedKeywords": ["list of keywords found"],
  "missingKeywords": ["important keywords not found"],
  "warnings": ["specific ATS issues found"],
  "suggestions": ["3-5 actionable improvement tips"]
}

RESUME:
${resumeText}
`.trim();

export const rewritePrompt = (resumeText: string, jobDescription: string) => `
You are an expert resume writer and ATS optimization specialist.

Rewrite the resume below to precisely match the provided Job Description. Rules:
1. Naturally weave in the JD's exact keywords and required skills.
2. Align the professional summary with the role's core requirements.
3. Reframe every experience bullet to emphasise relevant impact and outcomes.
4. Use strong action verbs (achieved, delivered, optimised, led, built, etc.).
5. Keep formatting ATS-friendly: plain text only, no tables, no columns, no special symbols.
6. Do NOT invent experience or qualifications — only reframe what exists.

--- ORIGINAL RESUME ---
${resumeText}

--- JOB DESCRIPTION ---
${jobDescription}

Output ONLY the rewritten resume in clean plain text. No preamble, no commentary, no markdown.
`.trim();

export const coverLetterPrompt = (
  resumeText: string,
  jobDescription: string,
  companyName: string,
  role: string,
  tone: string,
) => `
You are an expert cover letter writer. Write a compelling, ATS-optimized cover letter.

CANDIDATE RESUME:
${resumeText.slice(0, 2500)}

JOB DESCRIPTION:
${jobDescription.slice(0, 1500)}

Company: ${companyName || 'the company'}
Role: ${role || 'this position'}
Tone: ${tone}

Rules:
- 3-4 paragraphs, no more than 350 words
- Opening: Hook + why this company/role specifically
- Middle: 2-3 strongest achievements from resume that match JD keywords
- Closing: Strong call to action
- Never use clichés like "I am writing to apply" or "I am a team player"
- Sound human and specific, not templated
- Output ONLY the cover letter text, no subject line, no address block
`.trim();

export const interviewQuestionsPrompt = (
  resumeText: string,
  jobDescription: string,
  domain: string,
  difficulty: string,
) => `
You are a senior technical interviewer at a top tech company. Generate realistic interview questions for this candidate.

CANDIDATE RESUME:
${resumeText.slice(0, 2000)}

JOB DESCRIPTION:
${jobDescription.slice(0, 1200)}

Domain: ${domain}
Difficulty: ${difficulty}

Return ONLY valid JSON (no markdown):
{
  "behavioral": [
    {"question":"...", "why":"Why interviewers ask this", "hint":"How to answer using STAR method"}
  ],
  "technical": [
    {"question":"...", "expectedAnswer":"Brief expected answer", "difficulty":"easy/medium/hard"}
  ],
  "situational": [
    {"question":"...", "hint":"What strong answers include"}
  ],
  "aboutYou": [
    {"question":"..."}
  ],
  "companySpecific": [
    {"question":"..."}
  ]
}

Generate exactly 3 questions per category (15 total).
`.trim();

export const companyAtsPrompt = (resumeText: string, company: string, role: string) => {
  const companyProfiles: Record<string, string> = {
    google: 'Google values: Googleyness, problem solving at scale, data-driven decisions. Look for: algorithms, system design, distributed systems, Python/Go/Java, ML, open source, measurable impact',
    amazon: 'Amazon 16 Leadership Principles. Look for: customer obsession, ownership, data metrics, scale, frugality. Keywords: distributed systems, AWS, microservices, customer impact',
    microsoft: 'Microsoft values: growth mindset, clarity, energy. Look for: Azure, cloud, enterprise, C#, TypeScript, leadership, collaboration',
    meta: 'Meta values: move fast, long-term impact, be bold. Look for: React, Python, distributed systems, impact at scale, product intuition',
    infosys: 'Infosys: client value, leadership, integrity. Look for: Java, .NET, agile, client delivery, certifications, digital transformation',
    wipro: 'Wipro: spirit, integrity, passion. Look for: agile, Java, testing, client focus, domain expertise',
    tcs: 'TCS values: BVIT. Look for: Java, SAP, agile, certifications, large-scale delivery',
    startup: 'Startup values: ownership, speed, versatility, impact. Look for: full-stack, DevOps, customer focus, fast iteration, metrics',
  };

  const profile = companyProfiles[company.toLowerCase()] || `${company} standard tech company values`;

  return `
You are an expert ATS consultant who knows exactly what ${company} looks for.

COMPANY PROFILE: ${profile}

RESUME:
${resumeText.slice(0, 3000)}

TARGET ROLE: ${role}

Return ONLY valid JSON (no markdown):
{
  "companyFitScore": <0-100>,
  "cultureFitKeywords": ["kw1","kw2"],
  "missingForCompany": ["critical missing skill or keyword for this company"],
  "presentForCompany": ["matched company-specific keywords"],
  "recommendations": ["specific actionable advice for this company"],
  "interviewTips": ["tip1","tip2","tip3"]
}
`.trim();
};
