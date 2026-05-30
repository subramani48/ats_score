"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resume_controller_1 = require("../../../controllers/resume.controller");
const auth_middleware_1 = require("../../../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../../../middleware/rateLimit.middleware");
const router = (0, express_1.Router)();
router.post('/', rateLimit_middleware_1.uploadLimiter, auth_middleware_1.optionalAuth, resume_controller_1.uploadAndEnqueue);
router.get('/jobs/:jobId/status', resume_controller_1.getJobStatus);
router.get('/jobs/:jobId/stream', auth_middleware_1.optionalAuth, resume_controller_1.streamJobProgress);
exports.default = router;
//# sourceMappingURL=resume.routes.js.map