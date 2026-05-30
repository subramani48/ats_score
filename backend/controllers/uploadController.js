const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const analyzerService = require('../services/analyzerService');
const emailService = require('../services/emailService');
const telegramService = require('../services/telegramService');
const aiService = require('../services/aiService');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
}).single('resume');

const extractText = async (file) => {
    const isPDF = file.mimetype === 'application/pdf';
    const isDOCX = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (isPDF) {
        const pdfParserFunc = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
        const pdfData = await pdfParserFunc(file.buffer);
        return pdfData.text;
    }
    if (isDOCX) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value;
    }
    return file.buffer.toString('utf8');
};

const uploadResume = (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ error: 'File upload error', details: err.message });
        if (!req.file) return res.status(400).json({ error: 'Please upload a file' });

        const { name, email, domain, mode = 'analyze', jobDescription } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required.' });
        }
        if (mode === 'rewrite' && !jobDescription?.trim()) {
            return res.status(400).json({ error: 'Job description is required for rewrite mode.' });
        }

        try {
            const extractedText = await extractText(req.file);

            console.log('--- Upload Trace ---');
            console.log('File:', req.file.originalname, '| Mode:', mode, '| Domain:', domain);
            console.log('Extracted text length:', extractedText.length);

            // ── Rewrite mode ──────────────────────────────────────────
            if (mode === 'rewrite') {
                const rewrittenResume = await aiService.rewriteResume(extractedText, jobDescription);
                const emailSent = await emailService.sendRewrittenEmail(name, email, rewrittenResume);

                await telegramService.sendResumeToAdmin(req.file, { name, email, domain, score: 'N/A (rewrite)' });

                return res.json({
                    success: true,
                    mode: 'rewrite',
                    message: 'Resume rewritten and emailed successfully.',
                    emailSent,
                });
            }

            // ── Analyze mode (default) ────────────────────────────────
            const analysis = analyzerService.analyzeResume(extractedText, domain);
            console.log('Analysis score:', analysis.score);

            const emailSent = await emailService.sendReport(name, email, analysis);

            await telegramService.sendResumeToAdmin(req.file, { name, email, domain, score: analysis.score });

            return res.json({
                success: true,
                mode: 'analyze',
                score: analysis.score,
                suggestions: analysis.suggestions,
                emailSent,
            });

        } catch (error) {
            console.error('Error processing resume:', error);
            res.status(500).json({ error: error.message || 'Failed to process resume' });
        }
    });
};

module.exports = { uploadResume };
