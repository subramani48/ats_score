"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analysis_controller_1 = require("../../../controllers/analysis.controller");
const auth_middleware_1 = require("../../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/history', auth_middleware_1.requireAuth, analysis_controller_1.getUserHistory);
router.get('/analytics', auth_middleware_1.requireAuth, analysis_controller_1.getUserAnalytics);
router.get('/compare', auth_middleware_1.optionalAuth, analysis_controller_1.compareAnalyses);
router.get('/:id', auth_middleware_1.optionalAuth, analysis_controller_1.getAnalysis);
router.get('/:id/keyword-gap', auth_middleware_1.optionalAuth, analysis_controller_1.getKeywordGap);
router.post('/:id/chat', auth_middleware_1.optionalAuth, analysis_controller_1.chatWithAI);
exports.default = router;
//# sourceMappingURL=analysis.routes.js.map