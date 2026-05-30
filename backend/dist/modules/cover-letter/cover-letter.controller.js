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
exports.CoverLetterController = void 0;
const common_1 = require("@nestjs/common");
const cover_letter_service_1 = require("./cover-letter.service");
const generate_cover_letter_dto_1 = require("./dto/generate-cover-letter.dto");
const optional_auth_guard_1 = require("../../common/guards/optional-auth.guard");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let CoverLetterController = class CoverLetterController {
    constructor(service) {
        this.service = service;
    }
    generate(dto, user) {
        return this.service.generate(dto, user?.id);
    }
    getHistory(user) {
        return this.service.getUserHistory(user.id);
    }
};
exports.CoverLetterController = CoverLetterController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_cover_letter_dto_1.GenerateCoverLetterDto, Object]),
    __metadata("design:returntype", void 0)
], CoverLetterController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CoverLetterController.prototype, "getHistory", null);
exports.CoverLetterController = CoverLetterController = __decorate([
    (0, common_1.Controller)('cover-letters'),
    __metadata("design:paramtypes", [cover_letter_service_1.CoverLetterService])
], CoverLetterController);
//# sourceMappingURL=cover-letter.controller.js.map