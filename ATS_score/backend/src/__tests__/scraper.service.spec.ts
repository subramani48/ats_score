import { BadRequestException } from '@nestjs/common';
import { ScraperService } from '../modules/scraper/scraper.service';
import { safeGet } from '../common/http/safe-fetch';

jest.mock('../common/http/safe-fetch', () => ({ safeGet: jest.fn() }));
const mockSafeGet = safeGet as unknown as jest.Mock;

// Fix 4: the scraper only opens addresses through safeGet, and never leaks why a fetch failed
describe('ScraperService', () => {
  let service: ScraperService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ScraperService();
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
  });

  describe('fetchJobDescription()', () => {
    const page = `<html><head><title>Senior Dev | Acme Careers</title><meta property="og:site_name" content="Acme"></head>
      <body><nav>menu</nav><script>alert(1)</script><style>p{}</style><h1>Senior Developer</h1><p>Build APIs.</p><footer>legal</footer></body></html>`;

    it('fetches through safeGet and extracts title, company and cleaned text', async () => {
      mockSafeGet.mockResolvedValue(page);
      const result = await service.fetchJobDescription('https://example.com/job');
      expect(mockSafeGet).toHaveBeenCalledWith('https://example.com/job', expect.objectContaining({ headers: expect.any(Object) }));
      expect(result.title).toBe('Senior Dev');
      expect(result.company).toBe('Acme');
      expect(result.description).toContain('Build APIs.');
      expect(result.description).not.toMatch(/alert|menu|legal/);
    });

    it('caps the description at 5000 characters', async () => {
      mockSafeGet.mockResolvedValue(`<html><body>${'word '.repeat(5000)}</body></html>`);
      expect((await service.fetchJobDescription('https://example.com')).description.length).toBeLessThanOrEqual(5000);
    });

    it('does NOT reveal why a fetch failed (that would let someone map the internal network)', async () => {
      mockSafeGet.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:5432'));
      const error = await service.fetchJobDescription('http://internal').catch(e => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).not.toMatch(/ECONNREFUSED|10\.0\.0\.5|5432/);
      expect(error.message).toMatch(/paste the JD/i);
    });

    it('logs the real reason for the server administrator', async () => {
      mockSafeGet.mockRejectedValue(new Error('Address not allowed'));
      await service.fetchJobDescription('http://127.0.0.1').catch(() => undefined);
      expect(service['logger'].warn).toHaveBeenCalledWith(expect.stringContaining('Address not allowed'));
    });
  });

  describe('importLinkedIn()', () => {
    it.each(['https://www.linkedin.com/in/x', 'http://example.com/profile', 'HTTPS://EXAMPLE.COM/P', '  https://example.com/p  '])(
      'treats %p as an address and fetches it through safeGet', async input => {
        mockSafeGet.mockResolvedValue('<html><body>Jane Doe\nEngineer</body></html>');
        await service.importLinkedIn(input);
        expect(mockSafeGet).toHaveBeenCalledTimes(1);
      },
    );

    it('does not fetch anything for pasted profile text', async () => {
      const result = await service.importLinkedIn('Jane Doe\nSenior Engineer\nAbout\nI build things');
      expect(mockSafeGet).not.toHaveBeenCalled();
      expect(result.data.name).toBe('Jane Doe');
      expect(result.data.headline).toBe('Senior Engineer');
    });

    it('gives a generic message when the fetch fails, and logs the reason', async () => {
      mockSafeGet.mockRejectedValue(new Error('Destination not allowed'));
      const error = await service.importLinkedIn('http://169.254.169.254/').catch(e => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).not.toMatch(/169\.254|Destination/);
      expect(service['logger'].warn).toHaveBeenCalled();
    });
  });
});
