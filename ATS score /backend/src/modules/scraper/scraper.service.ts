import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { safeGet } from '../../common/http/safe-fetch';

// ── LinkedIn profile import helper ────────────────────────────────────────────
function parseLinkedInText(text: string) {
  const lower = text.toLowerCase();

  const sectionBounds = (keyword: string, maxLen = 1500) => {
    const idx = lower.indexOf(keyword);
    return idx === -1 ? '' : text.slice(idx, idx + maxLen).trim();
  };

  const skillsChunk = sectionBounds('skills', 600);
  const skills = skillsChunk
    ? skillsChunk.split(/[,\n•·]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 60)
    : [];

  const lines = text.split('\n').filter(l => l.trim());

  return {
    name:       lines[0]?.trim() ?? '',
    headline:   lines[1]?.trim() ?? '',
    about:      sectionBounds('about'),
    experience: sectionBounds('experience'),
    education:  sectionBounds('education'),
    skills:     skills.slice(0, 30),
    rawText:    text.slice(0, 8000),
  };
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  /**
   * Import a LinkedIn profile — accepts either a URL (best-effort) or raw pasted text.
   */
  async importLinkedIn(input: string) {
    let text = input;

    if (/^https?:\/\//i.test(input.trim())) {
      try {
        const data = await safeGet(input, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          },
        });
        // Strip HTML
        text = data.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
      } catch (err: unknown) {
        this.logger.warn(`LinkedIn import fetch failed: ${err instanceof Error ? err.message : String(err)}`);
        throw new BadRequestException(
          'LinkedIn blocks automated access. Please paste your profile text directly.',
        );
      }
    }

    return { success: true, data: parseLinkedInText(text) };
  }
  async fetchJobDescription(url: string): Promise<{ title: string; company: string; description: string }> {
    try {
      const html = await safeGet(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      // Strip scripts, styles, nav, footer
      const cleaned = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Extract page title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const rawTitle = titleMatch ? titleMatch[1] : 'Job Position';
      // Clean title: remove site name after | or -
      const title = rawTitle.replace(/\s*[|\-–—]\s*.+$/, '').trim() || 'Job Position';

      // Try to extract company from og:site_name or similar meta
      const companyMatch =
        html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i) ??
        html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i);
      const company = companyMatch ? companyMatch[1] : '';

      const description = cleaned.slice(0, 5000);

      return { title, company, description };
    } catch (err: unknown) {
      // Details go to the log only. Showing them to the caller would reveal what exists inside the network.
      this.logger.warn(`Job link fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new BadRequestException(
        'Could not fetch a job description from that link. Please paste the JD text manually.',
      );
    }
  }
}
