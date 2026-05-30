"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_repository_1 = require("../repositories/user.repository");
const errors_1 = require("../lib/errors");
const env_1 = require("../config/env");
const signToken = (userId, email) => jsonwebtoken_1.default.sign({ sub: userId, email }, env_1.env.JWT_SECRET, { expiresIn: '7d' });
const register = async (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password)
        throw new errors_1.ValidationError('email, name, and password are required');
    if (password.length < 8)
        throw new errors_1.ValidationError('Password must be at least 8 characters');
    const existing = await user_repository_1.userRepository.findByEmail(email);
    if (existing)
        throw new errors_1.ValidationError('An account with this email already exists');
    const passwordHash = await user_repository_1.userRepository.hashPassword(password);
    const user = await user_repository_1.userRepository.create({ email, name, passwordHash, provider: 'email' });
    const token = signToken(user.id, user.email);
    res.status(201).json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        throw new errors_1.ValidationError('email and password are required');
    const user = await user_repository_1.userRepository.findByEmail(email);
    if (!user || !user.passwordHash)
        throw new errors_1.UnauthorizedError('Invalid email or password');
    const valid = await user_repository_1.userRepository.verifyPassword(password, user.passwordHash);
    if (!valid)
        throw new errors_1.UnauthorizedError('Invalid email or password');
    const token = signToken(user.id, user.email);
    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
};
exports.login = login;
const getMe = async (req, res) => {
    if (!req.userId)
        throw new errors_1.UnauthorizedError();
    const user = await user_repository_1.userRepository.findById(req.userId);
    if (!user)
        throw new errors_1.NotFoundError('User');
    res.json({ success: true, data: { id: user.id, email: user.email, name: user.name, provider: user.provider, createdAt: user.createdAt } });
};
exports.getMe = getMe;
//# sourceMappingURL=user.controller.js.map