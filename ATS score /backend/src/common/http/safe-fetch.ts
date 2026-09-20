import axios from 'axios';
import * as dns from 'dns';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';

/**
 * Fetches a web page for a user-supplied address without letting the server be pointed at
 * private or internal destinations (server-side request forgery, "SSRF").
 *
 * Defences, all of which must hold:
 *  1. Only http/https on ports 80/443, no embedded credentials.
 *  2. Names must look like public hostnames (no single-word names such as "redis", no ".internal" etc.).
 *  3. IP addresses are checked against private, loopback, link-local and reserved ranges. For names,
 *     the check runs inside the connection's DNS lookup, so the address that is checked is the same
 *     address that is connected to (a name that changes its answer between check and connect fails).
 *  4. Every redirect is checked again, and there are at most 3.
 *  5. Size (2 MB), time (10 s idle, 15 s total) and content type (HTML or text) are capped.
 *
 * Errors are thrown as plain Errors. Callers should log them and show the user a generic message,
 * so the response never reveals what exists inside the network.
 */

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const IDLE_TIMEOUT_MS = 10_000;
const TOTAL_TIMEOUT_MS = 15_000;
const ALLOWED_PORTS = new Set([80, 443]);
const ALLOWED_TYPES = ['text/html', 'application/xhtml+xml', 'text/plain'];
const INTERNAL_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.intranet', '.home.arpa'];

const blocked = new net.BlockList();
const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8],        // "this network"
  ['10.0.0.0', 8],       // private
  ['100.64.0.0', 10],    // carrier-grade NAT
  ['127.0.0.0', 8],      // loopback
  ['169.254.0.0', 16],   // link-local, includes cloud metadata services
  ['172.16.0.0', 12],    // private
  ['192.0.0.0', 24],     // reserved
  ['192.0.2.0', 24],     // documentation
  ['192.168.0.0', 16],   // private
  ['198.18.0.0', 15],    // benchmarking
  ['198.51.100.0', 24],  // documentation
  ['203.0.113.0', 24],   // documentation
  ['224.0.0.0', 4],      // multicast
  ['240.0.0.0', 4],      // reserved
];
const BLOCKED_V6: Array<[string, number]> = [
  ['fc00::', 7],         // unique local (private)
  ['fe80::', 10],        // link-local
  ['ff00::', 8],         // multicast
  ['64:ff9b::', 96],     // NAT64, can wrap an internal IPv4 address
  ['100::', 64],         // discard-only
  // Do NOT add ::ffff:0:0/96 (IPv4-mapped) here: Node's BlockList compares IPv4 addresses as if they
  // were mapped, so that rule would block every IPv4 address. Mapped forms of internal addresses
  // (such as ::ffff:127.0.0.1) are already caught by the IPv4 rules above.
  ['2001:db8::', 32],    // documentation
];
for (const [addr, prefix] of BLOCKED_V4) blocked.addSubnet(addr, prefix, 'ipv4');
for (const [addr, prefix] of BLOCKED_V6) blocked.addSubnet(addr, prefix, 'ipv6');
blocked.addAddress('::', 'ipv6');
blocked.addAddress('::1', 'ipv6');

/** True if the address must not be contacted. Anything that is not a valid IP is treated as blocked. */
export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 0) return true;
  try {
    return blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
  } catch {
    return true;
  }
}

/** Throws unless the protocol, host and port describe a destination we are willing to contact. */
export function assertAllowedTarget(
  protocol: string,
  rawHost: string,
  port?: string | number | null,
): void {
  if (protocol !== 'http:' && protocol !== 'https:') throw new Error('Only http and https are allowed');

  const portNumber = port === undefined || port === null || port === '' ? undefined : Number(port);
  if (portNumber !== undefined && !ALLOWED_PORTS.has(portNumber)) throw new Error('Port not allowed');

  const host = rawHost.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (!host) throw new Error('Missing host');

  if (net.isIP(host)) {
    if (isBlockedAddress(host)) throw new Error('Address not allowed');
    return;
  }
  // Single-word names ("redis", "backend") resolve on private networks. Public sites always have a dot.
  if (!host.includes('.')) throw new Error('Host not allowed');
  if (INTERNAL_SUFFIXES.some(s => host.endsWith(s))) throw new Error('Host not allowed');
}

// Runs for every connection (including redirects). Node skips it for raw IP addresses, which is why
// assertAllowedTarget checks those separately.
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true } as dns.LookupAllOptions, (err, addresses) => {
    if (err) return callback(err, '', 0);
    if (addresses.length === 0 || addresses.some(a => isBlockedAddress(a.address))) {
      return callback(new Error('Destination not allowed') as NodeJS.ErrnoException, '', 0);
    }
    if (options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
};

export async function safeGet(
  rawUrl: string,
  options: { headers?: Record<string, string> } = {},
): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error('Not a valid URL');
  }
  if (url.username || url.password) throw new Error('URLs with credentials are not allowed');
  assertAllowedTarget(url.protocol, url.hostname, url.port);

  const res = await axios.get<string>(url.toString(), {
    headers: options.headers,
    timeout: IDLE_TIMEOUT_MS,
    signal: AbortSignal.timeout(TOTAL_TIMEOUT_MS),
    maxRedirects: MAX_REDIRECTS,
    maxContentLength: MAX_BYTES,
    maxBodyLength: MAX_BYTES,
    responseType: 'text',
    proxy: false, // a proxy would do its own DNS and skip our checks
    httpAgent: new http.Agent({ lookup: safeLookup }),
    httpsAgent: new https.Agent({ lookup: safeLookup }),
    beforeRedirect: (opts: Record<string, unknown>) => {
      assertAllowedTarget(
        String(opts.protocol ?? ''),
        String(opts.hostname ?? opts.host ?? ''),
        opts.port as string | number | undefined,
      );
    },
  });

  const type = String(res.headers['content-type'] ?? '').toLowerCase();
  if (!ALLOWED_TYPES.some(t => type.includes(t))) throw new Error(`Unexpected content type: ${type || 'none'}`);
  return typeof res.data === 'string' ? res.data : String(res.data);
}
