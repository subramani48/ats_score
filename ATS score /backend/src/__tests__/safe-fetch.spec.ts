import axios from 'axios';
import { assertAllowedTarget, isBlockedAddress, safeGet } from '../common/http/safe-fetch';

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
const mockGet = axios.get as unknown as jest.Mock;

// Fix 4: server-side request forgery (SSRF) protection
describe('isBlockedAddress()', () => {
  it.each([
    '127.0.0.1', '127.8.8.8', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.0.10', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fe80::1', 'fd00::1', 'fc00::5', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:169.254.169.254', '64:ff9b::a00:1',
    'not-an-ip', 'fe80::1%eth0', '',
  ])('blocks %p', address => expect(isBlockedAddress(address)).toBe(true));

  it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '172.15.255.255', '192.169.0.1', '100.63.255.255',
    '2606:4700:4700::1111', '2001:4860:4860::8888', '::ffff:8.8.8.8'])(
    'allows the public address %p (a rule that blocked these would refuse every website)',
    address => expect(isBlockedAddress(address)).toBe(false),
  );
});

describe('assertAllowedTarget()', () => {
  it.each([
    ['http:', 'localhost'], ['https:', 'LOCALHOST.'], ['http:', 'redis'], ['http:', 'backend'], ['http:', 'db.internal'],
    ['http:', 'printer.local'], ['http:', 'a.localhost'], ['http:', 'x.lan'], ['http:', 'x.intranet'], ['http:', 'x.home.arpa'],
    ['ftp:', 'example.com'], ['file:', 'example.com'], ['gopher:', 'example.com'],
    ['http:', '127.0.0.1'], ['http:', '[::1]'], ['http:', '169.254.169.254'], ['http:', '10.0.0.1'], ['http:', ''],
  ])('refuses %s//%s', (protocol, host) => expect(() => assertAllowedTarget(protocol, host)).toThrow());

  it.each([['5432'], ['6379'], ['8080'], [22]])('refuses port %p on a public host', port =>
    expect(() => assertAllowedTarget('http:', 'example.com', port)).toThrow(),
  );

  it.each([
    ['https:', 'example.com', ''], ['http:', 'careers.example.co.uk', '80'], ['https:', 'jobs.example.com', '443'],
    ['https:', '8.8.8.8', undefined], ['https:', 'boards.greenhouse.io', null],
  ])('allows %s//%s port %p', (protocol, host, port) => expect(() => assertAllowedTarget(protocol, host, port as never)).not.toThrow());
});

describe('safeGet()', () => {
  beforeEach(() => { mockGet.mockReset(); });
  const okResponse = (type = 'text/html; charset=utf-8', data: unknown = '<html>hi</html>') => ({ headers: { 'content-type': type }, data });

  it('refuses private, non-web and malformed addresses BEFORE any request is made', async () => {
    for (const url of ['http://127.0.0.1/', 'http://169.254.169.254/latest/meta-data', 'http://localhost/', 'http://redis/', 'https://example.com:5432/',
      'ftp://example.com/', 'not a url', 'http://user:pw@example.com/', 'http://2130706433/', 'http://[::1]/']) {
      await expect(safeGet(url)).rejects.toThrow();
    }
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('fetches a public page with every safety limit applied', async () => {
    mockGet.mockResolvedValue(okResponse());
    await expect(safeGet('https://example.com/jobs/1', { headers: { Accept: 'text/html' } })).resolves.toBe('<html>hi</html>');
    const [url, options] = mockGet.mock.calls[0];
    expect(url).toBe('https://example.com/jobs/1');
    expect(options).toMatchObject({
      maxRedirects: 3, maxContentLength: 2 * 1024 * 1024, maxBodyLength: 2 * 1024 * 1024,
      responseType: 'text', proxy: false, timeout: 10_000, headers: { Accept: 'text/html' },
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.httpAgent).toBeDefined();
    expect(options.httpsAgent).toBeDefined();
  });

  it('re-checks every redirect target', async () => {
    mockGet.mockResolvedValue(okResponse());
    await safeGet('https://example.com/');
    const { beforeRedirect } = mockGet.mock.calls[0][1];
    expect(() => beforeRedirect({ protocol: 'https:', hostname: 'careers.example.com' })).not.toThrow();
    expect(() => beforeRedirect({ protocol: 'http:', hostname: '169.254.169.254' })).toThrow();
    expect(() => beforeRedirect({ protocol: 'http:', hostname: 'localhost' })).toThrow();
    expect(() => beforeRedirect({ protocol: 'http:', hostname: 'example.com', port: 6379 })).toThrow();
    expect(() => beforeRedirect({ protocol: 'ftp:', hostname: 'example.com' })).toThrow();
  });

  it.each([['application/json'], ['application/octet-stream'], ['image/png'], ['']])('rejects content type %p', async type => {
    mockGet.mockResolvedValue(okResponse(type));
    await expect(safeGet('https://example.com/')).rejects.toThrow(/content type/i);
  });

  it.each([['text/html'], ['text/plain; charset=utf-8'], ['application/xhtml+xml']])('accepts content type %p', async type => {
    mockGet.mockResolvedValue(okResponse(type, 'body'));
    await expect(safeGet('https://example.com/')).resolves.toBe('body');
  });
});
