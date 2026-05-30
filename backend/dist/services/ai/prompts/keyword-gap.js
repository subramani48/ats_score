"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewritePrompt = exports.analyzePrompt = exports.keywordGapPrompt = void 0;
const keywordGapPrompt = (resumeText, jd) => `
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
exports.keywordGapPrompt = keywordGapPrompt;
const analyzePrompt = (resumeText, domain) => `
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
exports.analyzePrompt = analyzePrompt;
const rewritePrompt = (resumeText, jobDescription) => `
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
exports.rewritePrompt = rewritePrompt;
//# sourceMappingURL=keyword-gap.js.map