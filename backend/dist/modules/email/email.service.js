"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = EmailService_1 = class EmailService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(EmailService_1.name);
        const user = config.get('SMTP_USER', '');
        const pass = config.get('SMTP_PASS', '');
        if (!user || !pass) {
            this.logger.warn('SMTP credentials not configured — email sending disabled');
            this.transporter = null;
            return;
        }
        this.transporter = nodemailer.createTransport({
            host: config.get('SMTP_HOST', 'smtp.gmail.com'),
            port: config.get('SMTP_PORT', 587),
            secure: config.get('SMTP_PORT', 587) === 465,
            auth: { user, pass },
        });
    }
    async sendAnalysisEmail(name, email, result) {
        if (!this.transporter)
            return false;
        try {
            const scoreColor = result.score >= 70 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : '#ef4444';
            const breakdownRows = [
                { label: 'Keywords Match', value: result.breakdown.keywordScore, max: 40 },
                { label: 'Achievements', value: result.breakdown.achievementScore, max: 25 },
                { label: 'Formatting', value: result.breakdown.formattingScore, max: 20 },
                { label: 'Readability', value: result.breakdown.readabilityScore, max: 15 },
            ];
            const html = `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8f7ff;">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">ATS Analyzer</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Resume Analysis Report</p>
  </div>
  <div style="background:#fff;padding:36px 32px;">
    <h2 style="margin:0 0 12px;color:#0f0e1a;font-size:18px;">Hi ${name},</h2>
    <p style="color:#6b7280;margin:0 0 24px;line-height:1.6;">Your ATS analysis is complete. Here are your results:</p>
    <div style="text-align:center;padding:28px;background:linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.06));border:1px solid rgba(99,102,241,0.15);border-radius:16px;margin-bottom:28px;">
      <div style="font-size:56px;font-weight:800;color:${scoreColor};">${result.score}%</div>
      <div style="color:#6b7280;font-size:14px;margin-top:4px;">ATS Compatibility Score</div>
    </div>
    <h3 style="margin:0 0 12px;color:#0f0e1a;font-size:15px;font-weight:700;">Score Breakdown</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      ${breakdownRows.map(r => `
      <tr>
        <td style="padding:6px 0;color:#374151;font-size:13px;width:140px;">${r.label}</td>
        <td style="padding:6px 8px;">
          <div style="background:#f3f4f6;border-radius:4px;height:8px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,#6366f1,#8b5cf6);height:8px;width:${Math.round((r.value / r.max) * 100)}%;border-radius:4px;"></div>
          </div>
        </td>
        <td style="padding:6px 0;color:#6b7280;font-size:13px;text-align:right;width:60px;">${r.value}/${r.max}</td>
      </tr>`).join('')}
    </table>
    ${result.warnings.length > 0 ? `
    <h3 style="margin:0 0 8px;color:#0f0e1a;font-size:15px;font-weight:700;">⚠️ ATS Warnings</h3>
    <ul style="margin:0 0 20px;padding-left:20px;color:#b45309;line-height:1.9;font-size:13px;">
      ${result.warnings.map(w => `<li>${w}</li>`).join('')}
    </ul>` : ''}
    <h3 style="margin:0 0 12px;color:#0f0e1a;font-size:15px;font-weight:700;">Suggestions to Improve</h3>
    <ul style="margin:0 0 24px;padding-left:20px;color:#374151;line-height:1.9;font-size:14px;">
      ${result.suggestions.map(s => `<li>${s}</li>`).join('')}
    </ul>
    ${result.missingKeywords.length > 0 ? `
    <div style="background:#fef9ec;border:1px solid #fcd34d;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">Missing High-Value Keywords</p>
      <p style="margin:0;font-size:13px;color:#78350f;">${result.missingKeywords.slice(0, 10).join(' · ')}</p>
    </div>` : ''}
  </div>
  <div style="background:#f0effe;padding:20px 32px;text-align:center;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} ATS Analyzer</p>
  </div>
</div>`;
            const info = await this.transporter.sendMail({
                from: '"ATS Analyzer" <noreply@ats-analyzer.com>',
                to: email,
                subject: `Your ATS Resume Score: ${result.score}% — Full Report Inside`,
                html,
            });
            this.logger.log(`Analysis email sent to ${email} [${info.messageId}]`);
            return true;
        }
        catch (err) {
            this.logger.error(`Failed to send analysis email: ${err.message}`);
            return false;
        }
    }
    async sendRewriteEmail(name, email, rewrittenText) {
        if (!this.transporter)
            return false;
        try {
            const html = `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:700px;margin:0 auto;background:#f8f7ff;">
  <div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);padding:36px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">ATS Analyzer</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">AI-Optimised Resume — Ready to Apply</p>
  </div>
  <div style="background:#fff;padding:36px 32px;">
    <h2 style="margin:0 0 12px;color:#0f0e1a;font-size:18px;">Hi ${name},</h2>
    <p style="color:#6b7280;margin:0 0 24px;line-height:1.6;">Your resume has been rewritten by Gemini AI to match the job description you provided.</p>
    <div style="background:#f8f7ff;border:1px solid rgba(99,102,241,0.18);border-radius:12px;padding:24px;margin-bottom:28px;">
      <h3 style="margin:0 0 16px;color:#6366f1;font-size:12px;font-weight:700;text-transform:uppercase;">Your Optimised Resume</h3>
      <pre style="margin:0;white-space:pre-wrap;font-family:'Courier New',monospace;font-size:13px;color:#374151;line-height:1.75;">${rewrittenText}</pre>
    </div>
  </div>
  <div style="background:#f0effe;padding:20px 32px;text-align:center;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} ATS Analyzer</p>
  </div>
</div>`;
            const info = await this.transporter.sendMail({
                from: '"ATS Analyzer" <noreply@ats-analyzer.com>',
                to: email,
                subject: 'Your AI-Rewritten, ATS-Optimised Resume',
                html,
            });
            this.logger.log(`Rewrite email sent to ${email} [${info.messageId}]`);
            return true;
        }
        catch (err) {
            this.logger.error(`Failed to send rewrite email: ${err.message}`);
            return false;
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map