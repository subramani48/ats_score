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
exports.AnalysisController = void 0;
const common_1 = require("@nestjs/common");
const analysis_service_1 = require("./analysis.service");
const chat_dto_1 = require("./dto/chat.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let AnalysisController = class AnalysisController {
    constructor(analysisService) {
        this.analysisService = analysisService;
    }
    getUserHistory(user) {
        return this.analysisService.findByUserId(user.id);
    }
    getUserAnalytics(user) {
        return this.analysisService.getUserAnalytics(user.id);
    }
    compareAnalyses(ids) {
        const idList = (ids ?? '').split(',').filter(Boolean);
        return this.analysisService.compareAnalyses(idList);
    }
    getPeerBenchmark(domain, score) {
        return this.analysisService.getPeerBenchmark(domain ?? '', Number(score ?? 0));
    }
    findOne(id) {
        return this.analysisService.findById(id);
    }
    getKeywordGap(id) {
        return this.analysisService.getKeywordGap(id);
    }
    async chatWithAI(id, dto, res) {
        const { chat } = await this.analysisService.startChatSession(id);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        try {
            const streamResult = await chat.sendMessageStream(dto.message);
            const chunks = await streamResult.stream;
            for await (const chunk of chunks) {
                res.write(`data: ${JSON.stringify({ text: chunk.text() })}\n\n`);
            }
        }
        finally {
            res.write('event: done\ndata: {}\n\n');
            res.end();
        }
    }
};
exports.AnalysisController = AnalysisController;
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "getUserHistory", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "getUserAnalytics", null);
__decorate([
    (0, common_1.Get)('compare'),
    __param(0, (0, common_1.Query)('ids')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "compareAnalyses", null);
__decorate([
    (0, common_1.Get)('benchmark'),
    __param(0, (0, common_1.Query)('domain')),
    __param(1, (0, common_1.Query)('score')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "getPeerBenchmark", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/keyword-gap'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "getKeywordGap", null);
__decorate([
    (0, common_1.Post)(':id/chat'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, chat_dto_1.ChatDto, Object]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "chatWithAI", null);
exports.AnalysisController = AnalysisController = __decorate([
    (0, common_1.Controller)('analyses'),
    __metadata("design:paramtypes", [analysis_service_1.AnalysisService])
], AnalysisController);
//# sourceMappingURL=analysis.controller.js.map