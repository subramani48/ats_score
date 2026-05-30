"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const database_1 = require("../config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.userRepository = {
    findById: (id) => database_1.prisma.user.findUnique({ where: { id } }),
    findByEmail: (email) => database_1.prisma.user.findUnique({ where: { email } }),
    create: async (data) => database_1.prisma.user.create({ data }),
    upsertOAuth: (email, name, provider) => database_1.prisma.user.upsert({
        where: { email },
        update: { name, provider },
        create: { email, name, provider },
    }),
    hashPassword: (plain) => bcryptjs_1.default.hash(plain, 12),
    verifyPassword: (plain, hash) => bcryptjs_1.default.compare(plain, hash),
};
//# sourceMappingURL=user.repository.js.map