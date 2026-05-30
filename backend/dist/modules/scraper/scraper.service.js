"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ScraperService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
function parseLinkedInText(text) {
    const lower = text.toLowerCase();
    const sectionBounds = (keyword, maxLen = 1500) => {
        const idx = lower.indexOf(keyword);
        return idx === -1 ? '' : text.slice(idx, idx + maxLen).trim();
    };
    const skillsChunk = sectionBounds('skills', 600);
    const skills = skillsChunk
        ? skillsChunk.split(/[,\n•·]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 60)
        : [];
    const lines = text.split('\n').filter(l => l.trim());
    return {
        name: lines[0]?.trim() ?? '',
        headline: lines[1]?.trim() ?? '',
        about: sectionBounds('about'),
        experience: sectionBounds('experience'),
        education: sectionBounds('education'),
        skills: skills.slice(0, 30),
        rawText: text.slice(0, 8000),
    };
}
let ScraperService = ScraperService_1 = class ScraperService {
    constructor() {
        this.logger = new common_1.Logger(ScraperService_1.name);
    }
    async importLinkedIn(input) {
        let text = input;
        if (input.startsWith('http')) {
            try {
                const { data } = await axios_1.default.get(input, {
                    timeout: 10_000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                    },
                });
                text = data.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
            }
            catch {
                throw new common_1.BadRequestException('LinkedIn blocks automated access. Please paste your profile text directly.');
            }
        }
        return { success: true, data: parseLinkedInText(text) };
    }
    async fetchJobDescription(url) {
        if (!url.startsWith('http'))
            throw new common_1.BadRequestException('Invalid URL — must start with http/https');
        try {
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
                timeout: 12000,
                maxRedirects: 5,
            });
            const html = response.data;
            const cleaned = html
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
                .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
                .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const rawTitle = titleMatch ? titleMatch[1] : 'Job Position';
            const title = rawTitle.replace(/\s*[|\-–—]\s*.+$/, '').trim() || 'Job Position';
            const companyMatch = html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i) ??
                html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i);
            const company = companyMatch ? companyMatch[1] : '';
            const description = cleaned.slice(0, 5000);
            return { title, company, description };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new common_1.BadRequestException(`Could not fetch job description from URL (${msg}). Please paste the JD text manually.`);
        }
    }
};
exports.ScraperService = ScraperService;
exports.ScraperService = ScraperService = ScraperService_1 = __decorate([
    (0, common_1.Injectable)()
], ScraperService);
//# sourceMappingURL=scraper.service.js.map