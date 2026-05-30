"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractText = void 0;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
const errors_1 = require("../../lib/errors");
const extractText = async (buffer, mimeType) => {
    const isPDF = mimeType === 'application/pdf';
    const isDOCX = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (isPDF) {
        const fn = typeof pdf_parse_1.default === 'function' ? pdf_parse_1.default : pdf_parse_1.default.default;
        const data = await fn(buffer);
        return data.text;
    }
    if (isDOCX) {
        const result = await mammoth_1.default.extractRawText({ buffer });
        return result.value;
    }
    const text = buffer.toString('utf8');
    if (!text.trim())
        throw new errors_1.ValidationError('Could not extract text from the uploaded file');
    return text;
};
exports.extractText = extractText;
//# sourceMappingURL=parser.service.js.map