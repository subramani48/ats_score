"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer '))
        return authHeader.slice(7);
    const cookie = req.headers.cookie
        ?.split(';')
        .find(c => c.trim().startsWith('next-auth.session-token='));
    return cookie ? cookie.split('=')[1] : null;
};
const requireAuth = (req, _res, next) => {
    const token = extractToken(req);
    if (!token)
        throw new errors_1.UnauthorizedError();
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.userId = payload.sub;
        next();
    }
    catch {
        throw new errors_1.UnauthorizedError('Invalid or expired session');
    }
};
exports.requireAuth = requireAuth;
const optionalAuth = (req, _res, next) => {
    const token = extractToken(req);
    if (token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
            req.userId = payload.sub;
        }
        catch {
            // ignore — user is just anonymous
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.middleware.js.map