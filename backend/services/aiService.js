const { GoogleGenerativeAI } = require('@google/generative-ai');

const rewriteResume = async (resumeText, jobDescription) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured in .env');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-latest' });

    const prompt = `You are an expert resume writer and ATS optimization specialist.

Rewrite the resume below to precisely match the provided Job Description. Follow these rules:
1. Naturally weave in the JD's exact keywords and required skills.
2. Align the professional summary / objective with the role's core requirements.
3. Reframe every experience bullet to emphasise relevant impact and outcomes.
4. Use strong action verbs (achieved, delivered, optimised, led, built, etc.).
5. Keep formatting ATS-friendly: plain text only, no tables, no columns, no special symbols.
6. Do NOT invent experience or qualifications — only reframe what is already present.

--- ORIGINAL RESUME ---
${resumeText}

--- JOB DESCRIPTION ---
${jobDescription}

Output ONLY the rewritten resume in clean plain text. No preamble, no commentary, no markdown.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
};

module.exports = { rewriteResume };
