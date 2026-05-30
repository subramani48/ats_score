"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeRepository = void 0;
const database_1 = require("../config/database");
exports.resumeRepository = {
    findById: (id) => database_1.prisma.resume.findUnique({ where: { id }, include: { analyses: true } }),
    findByUserId: (userId) => database_1.prisma.resume.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } } }),
    create: (data) => database_1.prisma.resume.create({ data }),
};
//# sourceMappingURL=resume.repository.js.map