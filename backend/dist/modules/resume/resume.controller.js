"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const throttler_1 = require("@nestjs/throttler");
const multer_1 = require("multer");
const rxjs_1 = require("rxjs");
const resume_service_1 = require("./resume.service");
const upload_resume_dto_1 = require("./dto/upload-resume.dto");
const optional_auth_guard_1 = require("../../common/guards/optional-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let ResumeController = class ResumeController {
    constructor(resumeService) {
        this.resumeService = resumeService;
    }
    async uploadAndEnqueue(file, body, user) {
        if (!file)
            throw new common_1.BadRequestException('Please upload a PDF or DOCX file');
        const jobId = await this.resumeService.enqueue({
            resumeBuffer: file.buffer.toString('base64'),
            mode: body.mode ?? 'analyze',
            domain: body.domain,
            jobDescription: body.jobDescription,
            userId: user?.id,
            name: body.name,
            email: body.email,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
        }, body.mode);
        return {
            success: true,
            jobId,
            message: 'Analysis queued — connect to the SSE stream for real-time progress',
        };
    }
    getJobStatus(jobId) {
        return this.resumeService.getJobStatus(jobId);
    }
    streamJobProgress(jobId) {
        return this.resumeService.streamProgress(jobId);
    }
};
exports.ResumeController = ResumeController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    (0, throttler_1.Throttle)({ upload: { ttl: 60 * 60 * 1000, limit: 15 } }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('resume', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB ?? '5', 10) * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const allowed = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
            ];
            cb(null, allowed.includes(file.mimetype));
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upload_resume_dto_1.UploadResumeDto, Object]),
    __metadata("design:returntype", Promise)
], ResumeController.prototype, "uploadAndEnqueue", null);
__decorate([
    (0, common_1.Get)('jobs/:jobId/status'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ResumeController.prototype, "getJobStatus", null);
__decorate([
    (0, common_1.Sse)('jobs/:jobId/stream'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", rxjs_1.Observable)
], ResumeController.prototype, "streamJobProgress", null);
exports.ResumeController = ResumeController = __decorate([
    (0, common_1.Controller)('resumes'),
    __metadata("design:paramtypes", [resume_service_1.ResumeService])
], ResumeController);
//# sourceMappingURL=resume.controller.js.map