import { lookup as dnsLookup } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { isBlockedAddress } from './address';

export class FetchRefused extends Error {
  constructor(readonly reason: string) {
    super(`fetch refused: ${reason}`);
  }
}

export interface SafeFetchOptions {
  // page: an HTML product page (link import). image: a product photo from a forwarded receipt,
  // kept as bytes and never decoded here (the rendition pipeline checks it like an upload).
  kind?: 'page' | 'image';
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  // Dev/e2e only (ALLOW_PRIVATE_FETCH): permits http and private addresses for a local fixture.
  allowPrivate?: boolean;
  // Injected in tests; defaults to the system resolver.
  resolve?: LookupFunction;
  // Injected in tests to script redirects without a network.
  transport?: (url: URL) => Promise<HopResult>;
}

export interface HopResult {
  status: number;
  location: string | null;
  contentType: string;
  body: string;
  // The raw bytes, kept for an image fetch.
  bytes?: Buffer;
}

export interface FetchedPage {
  url: string;
  status: number;
  contentType: string;
  body: string;
  bytes?: Buffer;
}

const ALLOWED_TYPES = {
  page: ['text/html', 'application/xhtml+xml'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

// Validates the URL itself before any network: scheme, credentials, port, IP literals.
export function checkUrl(raw: string, allowPrivate = false): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchRefused('invalid_url');
  }
  if (url.protocol !== 'https:' && !(allowPrivate && url.protocol === 'http:')) {
    throw new FetchRefused('scheme');
  }
  if (url.username || url.password) throw new FetchRefused('credentials');
  if (url.port && !allowPrivate && url.port !== '443') throw new FetchRefused('port');
  // WHATWG parsing already turned 2130706433 / 0x7f.1 / 0177.0.0.1 into dotted form.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (
    !allowPrivate &&
    (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal'))
  ) {
    throw new FetchRefused('private_host');
  }
  // Node skips `lookup` for IP literals, so they're judged here.
  if (isIP(host) && isBlockedAddress(host) && !allowPrivate)
    throw new FetchRefused('private_address');
  return url;
}

// The resolver the socket connects with: every candidate address is checked, and the checked
// address is the one used, so a DNS rebind between check and connect can't slip through.
function guardedLookup(allowPrivate: boolean, resolve: LookupFunction): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err, '', 4);
      const list = (Array.isArray(addresses) ? addresses : [{ address: addresses, family: 4 }]) as {
        address: string;
        family: number;
      }[];
      const bad = list.find((a) => isBlockedAddress(a.address));
      if (!list.length || (bad && !allowPrivate)) {
        return callback(new FetchRefused('private_address'), '', 4);
      }
      const first = list[0] as { address: string; family: number };
      if (options.all) return callback(null, list as never, first.family);
      callback(null, first.address, first.family);
    });
  };
}

type HopOptions = {
  kind: 'page' | 'image';
  maxBytes: number;
  timeoutMs: number;
  allowPrivate: boolean;
  resolve: LookupFunction;
};

function requestOnce(url: URL, opts: HopOptions) {
  return new Promise<HopResult>((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(
      url,
      {
        method: 'GET',
        lookup: guardedLookup(opts.allowPrivate, opts.resolve),
        headers: {
          'user-agent': 'RobesLinkImport/1.0 (+https://byrobes.com)',
          accept: ALLOWED_TYPES[opts.kind].join(','),
        },
        timeout: opts.timeoutMs,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers['content-type'] ?? '').toLowerCase();
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location ?? null, contentType, body: '' });
        }
        if (!ALLOWED_TYPES[opts.kind].some((t) => contentType.startsWith(t))) {
          res.destroy();
          return reject(new FetchRefused('content_type'));
        }
        const declared = Number(res.headers['content-length'] ?? 0);
        if (declared > opts.maxBytes) {
          res.destroy();
          return reject(new FetchRefused('too_large'));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > opts.maxBytes) {
            res.destroy();
            reject(new FetchRefused('too_large'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          const bytes = Buffer.concat(chunks);
          resolve(
            opts.kind === 'image'
              ? { status, location: null, contentType, body: '', bytes }
              : { status, location: null, contentType, body: bytes.toString('utf8') },
          );
        });
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new FetchRefused('timeout')));
    req.on('error', (err) =>
      reject(err instanceof FetchRefused ? err : new FetchRefused('network')),
    );
    req.end();
  });
}

// SEC-40: the only way Robes fetches a URL someone gave it.
export async function safeFetch(raw: string, options: SafeFetchOptions = {}): Promise<FetchedPage> {
  const opts = {
    kind: options.kind ?? 'page',
    maxBytes: options.maxBytes ?? 2_000_000,
    timeoutMs: options.timeoutMs ?? 8_000,
    maxRedirects: options.maxRedirects ?? 3,
    allowPrivate: options.allowPrivate ?? false,
    resolve: options.resolve ?? (dnsLookup as unknown as LookupFunction),
  };
  let url = checkUrl(raw, opts.allowPrivate);
  for (let hop = 0; hop <= opts.maxRedirects; hop++) {
    const res = options.transport ? await options.transport(url) : await requestOnce(url, opts);
    if (res.location === null) {
      if (res.status < 200 || res.status >= 300) throw new FetchRefused(`status_${res.status}`);
      return {
        url: url.toString(),
        status: res.status,
        contentType: res.contentType,
        body: res.body,
        ...(res.bytes ? { bytes: res.bytes } : {}),
      };
    }
    // Every hop is re-validated from scratch, so a redirect can't lead somewhere private.
    url = checkUrl(new URL(res.location, url).toString(), opts.allowPrivate);
  }
  throw new FetchRefused('too_many_redirects');
}
