"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoverLetterModule = void 0;
const common_1 = require("@nestjs/common");
const cover_letter_controller_1 = require("./cover-letter.controller");
const cover_letter_service_1 = require("./cover-letter.service");
const ai_module_1 = require("../ai/ai.module");
let CoverLetterModule = class CoverLetterModule {
};
exports.CoverLetterModule = CoverLetterModule;
exports.CoverLetterModule = CoverLetterModule = __decorate([
    (0, common_1.Module)({
        imports: [ai_module_1.AiModule],
        controllers: [cover_letter_controller_1.CoverLetterController],
        providers: [cover_letter_service_1.CoverLetterService],
    })
], CoverLetterModule);
//# sourceMappingURL=cover-letter.module.js.map