"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resume_routes_1 = __importDefault(require("./routes/resume.routes"));
const analysis_routes_1 = __importDefault(require("./routes/analysis.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const router = (0, express_1.Router)();
router.use('/resumes', resume_routes_1.default);
router.use('/analyses', analysis_routes_1.default);
router.use('/users', user_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map