// Prompts for the Interview Pro modules (mock interview, STAR stories, battle card, follow-ups).
// Everything the user typed is wrapped in tags and declared untrusted so it is analysed, never obeyed.

import { UNTRUSTED, tag } from './prompt-safety';

const PERSONAS: Record<string, string> = {
  friendly: 'Warm and encouraging. Gives the candidate room to think.',
  neutral: 'Professional and balanced, like a typical structured interview.',
  tough: 'Sceptical and direct. Pushes back on vague claims and asks for evidence and numbers.',
};

export interface MockContext {
  role: string;
  company?: string | null;
  domain: string;
  difficulty: string;
  persona: string;
  resumeText: string;
  jobDescription?: string | null;
}

const mockContext = (c: MockContext) => `
${UNTRUSTED}
ROLE: ${c.role}${c.company ? ` at ${c.company}` : ''}
DOMAIN: ${c.domain}
DIFFICULTY: ${c.difficulty}
INTERVIEWER STYLE: ${PERSONAS[c.persona] ?? PERSONAS.neutral}
${tag('resume', c.resumeText, 2500)}
${tag('job_description', c.jobDescription ?? '', 1500)}`;

export const mockFirstQuestionPrompt = (c: MockContext) => `
You are conducting a realistic mock job interview.
${mockContext(c)}

Open with ONE question that suits an interview opener for this role (e.g. an introduction tied to the resume).
Return ONLY JSON: {"question":"...","category":"behavioral|technical|situational|aboutYou"}
`.trim();

export interface MockTurnLike {
  question: string;
  category: string;
  answer?: string;
  evaluation?: { overall?: number };
}

export const mockAnswerPrompt = (
  c: MockContext,
  history: MockTurnLike[],
  answer: string,
  delivery: { durationSec?: number; wordsPerMinute?: number; fillerCount?: number } | undefined,
  isLast: boolean,
) => {
  const current = history[history.length - 1];
  const earlier = history
    .slice(0, -1)
    .map((t, i) => `Q${i + 1} (${t.category}, scored ${t.evaluation?.overall ?? '?'}/10): ${t.question}`)
    .join('\n');
  return `
You are an interviewer AND a coach. Evaluate the candidate's answer honestly, then continue the interview.
${mockContext(c)}

Earlier questions:
${earlier || '(none)'}

CURRENT QUESTION (${current.category}): ${current.question}
${tag('answer', answer, 4000)}
Spoken delivery metrics (may be absent if typed): ${JSON.stringify(delivery ?? {})}

Scoring rules (each 0-10, be strict and consistent, do not inflate):
- relevance: does it answer what was asked
- structure: clear order; for behavioral questions use STAR (situation, task, action, result)
- depth: specifics, trade-offs, metrics, ownership
- clarity: concise, easy to follow
- confidence: assertive wording; penalise hedging and, if metrics are given, excessive filler words or pace far outside 110-170 wpm
"overall" is 0-10 and reflects the five scores.

${
  isLast
    ? 'This was the final question: set "nextQuestion" to null.'
    : `Choose the next question adaptively:
- overall < 5: ask a simpler follow-up on the same topic to help the candidate recover
- overall 5-7: probe for specifics, numbers or trade-offs in what they just said
- overall >= 8: move to a new topic and raise the difficulty
Vary categories across the interview.`
}

Return ONLY JSON:
{
  "evaluation": {
    "scores": {"relevance":0,"structure":0,"depth":0,"clarity":0,"confidence":0},
    "overall": 0,
    "strengths": ["..."],
    "improvements": ["specific, actionable"],
    "betterAnswer": "a stronger version of THEIR answer, using only facts they gave or that are in their resume",
    "deliveryNote": "one sentence on delivery, or empty string if no metrics"
  },
  "nextQuestion": ${isLast ? 'null' : '{"question":"...","category":"behavioral|technical|situational|aboutYou"}'}
}
`.trim();
};

export const mockReportPrompt = (c: MockContext, turns: MockTurnLike[]) => `
You are an interview coach writing the final report for a mock interview.
${mockContext(c)}

Transcript summary:
${turns
  .filter(t => t.answer !== undefined)
  .map(
    (t, i) =>
      `Q${i + 1} (${t.category}, ${t.evaluation?.overall ?? '?'}/10): ${t.question}\nAnswer: ${(t.answer ?? '').slice(0, 600).replace(/</g, '‹')}`,
  )
  .join('\n\n')}

Return ONLY JSON:
{
  "readinessScore": 0,
  "verdict": "one honest sentence, e.g. 'Ready for mid-level roles; work on quantifying impact'",
  "categoryScores": {"communication":0,"structure":0,"technicalDepth":0,"relevance":0,"confidence":0},
  "strengths": ["..."],
  "topFixes": [{"issue":"...","fix":"..."}],
  "practicePlan": [{"day":1,"focus":"...","task":"..."}]
}
readinessScore is 0-100 based ONLY on this session. categoryScores are 0-10. Give 3 topFixes and a 7-day practicePlan.
`.trim();

export const starExtractPrompt = (resumeText: string, count: number) => `
You are an interview coach. Turn this resume into ${count} reusable STAR interview stories.
${UNTRUSTED}
${tag('resume', resumeText, 5000)}

Rules:
- Base every story ONLY on facts in the resume. If a detail (like a number) is not in the resume, do not invent it; write a bracketed placeholder such as "[add your metric]".
- Cover different competencies: leadership, ownership, conflict, failure/learning, technical problem-solving, teamwork, deadline pressure, initiative.

Return ONLY JSON:
{"stories":[{"title":"...","competencies":["..."],"situation":"...","task":"...","action":"...","result":"...","metrics":["..."],"followUps":["likely follow-up question the interviewer may ask"]}]}
`.trim();

export const starMatchPrompt = (
  question: string,
  stories: Array<{ id: string; title: string; competencies: string[]; situation: string; result: string }>,
) => `
You help a candidate choose which prepared story to tell.
${UNTRUSTED}
${tag('question', question, 500)}
Stories:
${stories
  .map(s => `- id=${s.id} | ${s.title} | ${s.competencies.join(', ')} | ${s.situation.slice(0, 200)} | Result: ${s.result.slice(0, 150)}`)
  .join('\n')
  .replace(/</g, '‹')}

Pick the best 1-3 stories for this question, best first.
Return ONLY JSON:
{"matches":[{"storyId":"<id from list>","fitScore":0,"whyItFits":"...","howToAdapt":"how to angle the story for this question","openingLine":"first sentence to say"}],"gap":"if none fit well, name the missing story type, else empty string"}
fitScore is 0-100.
`.trim();

export const battleCardPrompt = (input: {
  company: string;
  role: string;
  jobDescription?: string;
  resumeText?: string;
  experienceYears?: number;
  location?: string;
}) => `
You are a career strategist preparing an interview battle card.
${UNTRUSTED}
COMPANY: ${input.company.replace(/</g, '‹')}
ROLE: ${input.role.replace(/</g, '‹')}
EXPERIENCE: ${input.experienceYears ?? 'unknown'} years
LOCATION: ${(input.location ?? 'unknown').replace(/</g, '‹')}
${tag('job_description', input.jobDescription, 2000)}
${tag('resume', input.resumeText, 2000)}

Important honesty rules:
- You have NO live web access. Base the company overview on general knowledge and say so where unsure.
- Do NOT invent specific salary numbers, headcounts, funding or news. For pay, give a research method and negotiation scripts with placeholders like [your target].

Return ONLY JSON:
{
  "companySnapshot": "3-4 sentences of general knowledge, hedged where unsure",
  "likelyRounds": [{"name":"...","format":"...","whatTheyTest":"...","prepTips":["..."]}],
  "topQuestions": [{"question":"...","angle":"how to approach it"}],
  "questionsToAsk": ["smart questions for the interviewer"],
  "redFlagsToProbe": ["things to gently check about the team or company"],
  "talkingPoints": ["resume-backed strengths to emphasise for this role"],
  "salaryNegotiation": {
    "researchSteps": ["where and how to find real market data"],
    "anchoringScript": "what to say when asked about expectations, with [placeholders]",
    "counterOfferScript": "what to say to a first offer, with [placeholders]",
    "beyondBaseSalary": ["joining bonus, equity, notice period, remote days, learning budget..."],
    "avoid": ["things not to say"]
  },
  "first90Days": [{"phase":"Days 1-30","goals":["..."]}],
  "disclaimer": "One sentence reminding the user this is AI-generated without live data and should be verified."
}
`.trim();

export const followUpEmailPrompt = (input: {
  type: string;
  company: string;
  role: string;
  interviewerName?: string;
  context?: string;
  notes?: string | null;
}) => `
Write a short, human, professional email for a job seeker.
${UNTRUSTED}
TYPE: ${input.type} (thank-you = after an interview; follow-up = no response yet; negotiation = reply to an offer asking to discuss terms; decline = politely decline an offer)
COMPANY: ${input.company.replace(/</g, '‹')}
ROLE: ${input.role.replace(/</g, '‹')}
INTERVIEWER: ${(input.interviewerName ?? 'the hiring team').replace(/</g, '‹')}
${tag('context', input.context, 1000)}
${tag('notes', input.notes ?? '', 800)}

Rules: under 150 words, no clichés like "I hope this email finds you well", reference something specific from the context when given, never invent facts, leave [brackets] for anything unknown.
Return ONLY JSON: {"subject":"...","body":"..."}
`.trim();
