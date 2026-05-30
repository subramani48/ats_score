# Task: JD-Based AI Resume Rewriting

## Goal
Enable users to upload a Resume and paste a LinkedIn Job Description (JD) to get an AI-rewritten, optimized resume sent to their email.

## Implementation Details
1. **Frontend (`src/components/UploadSection.tsx`)**:
   - Add a required Textarea for "Job Description".
   - Include `jobDescription` in the `formData` sent to the backend.
   - Add a toggle/mode for "Analyze" vs "Rewrite & Email".

2. **Backend API (`controllers/uploadController.js`)**:
   - Extract text from Resume (already implemented).
   - Capture `jobDescription` from `req.body`.
   - Call `aiService.rewriteResume(resumeText, jobDescription)`.

3. **AI Service (`services/aiService.js`) [NEW]**:
   - Use `@google/generative-ai` (Gemini).
   - Prompt AI: "Rewrite this resume to match the following Job Description. Optimize for ATS keywords and professional impact. [Resume] [JD]".
   - Return the rewritten text.

4. **Email Service (`services/emailService.js`)**:
   - Create `sendRewrittenEmail(name, email, rewrittenContent)`.
   - Send the result to the user's email with professional formatting.

## Claude Actions:
- `npm install @google/generative-ai` in `backend`.
- Add `GEMINI_API_KEY` to `.env`.
- Wire the frontend input to the backend service.
- Ensure the rewritten resume is emailed immediately after AI processing.

*Note: Keep code minimal and reuse existing Multer/Nodemailer logic.*
