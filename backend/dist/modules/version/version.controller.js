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
exports.VersionController = void 0;
const common_1 = require("@nestjs/common");
const version_service_1 = require("./version.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let VersionController = class VersionController {
    constructor(service) {
        this.service = service;
    }
    getVersions(resumeId) {
        return this.service.getVersions(resumeId);
    }
    createSnapshot(resumeId, body) {
        return this.service.createVersion(resumeId, body.label, body.score, body.domain);
    }
    compare(ids) {
        const idList = (ids ?? '').split(',').filter(Boolean);
        return this.service.compareVersions(idList);
    }
};
exports.VersionController = VersionController;
__decorate([
    (0, common_1.Get)('resume/:resumeId'),
    __param(0, (0, common_1.Param)('resumeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VersionController.prototype, "getVersions", null);
__decorate([
    (0, common_1.Post)('resume/:resumeId/snapshot'),
    __param(0, (0, common_1.Param)('resumeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], VersionController.prototype, "createSnapshot", null);
__decorate([
    (0, common_1.Get)('compare'),
    __param(0, (0, common_1.Query)('ids')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VersionController.prototype, "compare", null);
exports.VersionController = VersionController = __decorate([
    (0, common_1.Controller)('versions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [version_service_1.VersionService])
], VersionController);
//# sourceMappingURL=version.controller.js.map