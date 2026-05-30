"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWithAI = exports.getKeywordGap = exports.compareAnalyses = exports.getUserAnalytics = exports.getUserHistory = exports.getAnalysis = void 0;
const analysis_repository_1 = require("../repositories/analysis.repository");
const errors_1 = require("../lib/errors");
const gemini_service_1 = require("../services/ai/gemini.service");
const getAnalysis = async (req, res) => {
    const analysis = await analysis_repository_1.analysisRepository.findById(req.params.id);
    if (!analysis)
        throw new errors_1.NotFoundError('Analysis');
    res.json({ success: true, data: analysis });
};
exports.getAnalysis = getAnalysis;
const getUserHistory = async (req, res) => {
    if (!req.userId)
        throw new errors_1.UnauthorizedError();
    const analyses = await analysis_repository_1.analysisRepository.findByUserId(req.userId);
    res.json({ success: true, data: analyses });
};
exports.getUserHistory = getUserHistory;
const getUserAnalytics = async (req, res) => {
    if (!req.userId)
        throw new errors_1.UnauthorizedError();
    const analytics = await analysis_repository_1.analysisRepository.getUserAnalytics(req.userId);
    res.json({ success: true, data: analytics });
};
exports.getUserAnalytics = getUserAnalytics;
const compareAnalyses = async (req, res) => {
    const ids = (req.query.ids ?? '').split(',').filter(Boolean).slice(0, 5);
    if (ids.length < 2) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Provide at least 2 analysis IDs via ?ids=id1,id2' } });
        return;
    }
    const results = await Promise.all(ids.map(id => analysis_repository_1.analysisRepository.findById(id)));
    const found = results.filter(Boolean);
    res.json({ success: true, data: found });
};
exports.compareAnalyses = compareAnalyses;
const getKeywordGap = async (req, res) => {
    const analysis = await analysis_repository_1.analysisRepository.findById(req.params.id);
    if (!analysis)
        throw new errors_1.NotFoundError('Analysis');
    if (!analysis.jobDescription) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No job description for this analysis' } });
        return;
    }
    const gap = await (0, gemini_service_1.geminiKeywordGap)(analysis.resume.extractedText ?? '', analysis.jobDescription);
    res.json({ success: true, data: gap });
};
exports.getKeywordGap = getKeywordGap;
const chatWithAI = async (req, res) => {
    const analysis = await analysis_repository_1.analysisRepository.findById(req.params.id);
    if (!analysis)
        throw new errors_1.NotFoundError('Analysis');
    const { message } = req.body;
    if (!message?.trim()) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'message is required' } });
        return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();
    const chat = await (0, gemini_service_1.startResumeChat)(analysis.resume.extractedText ?? '', analysis.score ?? 0, analysis.domain, analysis.keywordsMissed);
    const stream = await chat.sendMessageStream(message);
    const streamResult = await stream.stream;
    for await (const chunk of streamResult) {
        res.write(`data: ${JSON.stringify({ text: chunk.text() })}\n\n`);
    }
    res.write('event: done\ndata: {}\n\n');
    res.end();
};
exports.chatWithAI = chatWithAI;
//# sourceMappingURL=analysis.controller.js.map