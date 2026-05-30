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
exports.BatchController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const batch_service_1 = require("./batch.service");
const batch_analyze_dto_1 = require("./dto/batch-analyze.dto");
const optional_auth_guard_1 = require("../../common/guards/optional-auth.guard");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let BatchController = class BatchController {
    constructor(service) {
        this.service = service;
    }
    analyze(dto, user) {
        return this.service.analyze(dto, user?.id);
    }
    getHistory(user) {
        return this.service.getUserBatchJobs(user.id);
    }
};
exports.BatchController = BatchController;
__decorate([
    (0, common_1.Post)('analyze'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    (0, throttler_1.Throttle)({ upload: { ttl: 60 * 60 * 1000, limit: 5 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [batch_analyze_dto_1.BatchAnalyzeDto, Object]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "analyze", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BatchController.prototype, "getHistory", null);
exports.BatchController = BatchController = __decorate([
    (0, common_1.Controller)('batch'),
    __metadata("design:paramtypes", [batch_service_1.BatchService])
], BatchController);
//# sourceMappingURL=batch.controller.js.map