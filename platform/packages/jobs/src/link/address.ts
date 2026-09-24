import { isIP } from 'node:net';

// SEC-40: addresses a user-supplied URL may never reach. Everything that isn't plainly public
// unicast is refused, including the cloud metadata service and IPv6 transition ranges.
const V4_BLOCKED: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function v4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

function inV4(ip: string, [base, bits]: [string, number]): boolean {
  const size = 2 ** (32 - bits);
  return Math.floor(v4ToInt(ip) / size) === Math.floor(v4ToInt(base) / size);
}

// Expands an IPv6 address to eight 16-bit groups (handles "::" and a dotted IPv4 tail).
function v6Groups(ip: string): number[] | null {
  let text = ip.toLowerCase().split('%')[0] ?? '';
  const v4Tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(text);
  if (v4Tail?.[1]) {
    const n = v4ToInt(v4Tail[1]);
    text = `${text.slice(0, -v4Tail[1].length)}${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail] = text.split('::');
  const parse = (s: string | undefined) =>
    s ? s.split(':').map((g) => Number.parseInt(g, 16)) : [];
  const h = parse(head);
  const t = parse(tail);
  const groups = text.includes('::') ? [...h, ...Array(8 - h.length - t.length).fill(0), ...t] : h;
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff)
    ? groups
    : null;
}

function embeddedV4(groups: number[]): string {
  const [a = 0, b = 0] = [groups[6], groups[7]];
  return `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
}

export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return V4_BLOCKED.some((range) => inV4(ip, range)) || ip === '255.255.255.255';
  if (family !== 6) return true;
  const g = v6Groups(ip);
  if (!g) return true;
  const [g0 = 0, g1 = 0] = g;
  if (g.every((x) => x === 0)) return true; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  // IPv4-mapped (::ffff:a.b.c.d), IPv4-compatible (::a.b.c.d) and NAT64 (64:ff9b::/96) carry an
  // IPv4 address: judge that address.
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) {
    return isBlockedAddress(embeddedV4(g));
  }
  if (g0 === 0x64 && g1 === 0xff9b) return isBlockedAddress(embeddedV4(g));
  if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
  if ((g0 & 0xff00) === 0xff00) return true; // multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return true; // documentation
  if (g0 === 0x2002)
    return isBlockedAddress(`${g1 >> 8}.${g1 & 255}.${(g[2] ?? 0) >> 8}.${(g[2] ?? 0) & 255}`); // 6to4
  if (g0 === 0x0100 && g.slice(1, 4).every((x) => x === 0)) return true; // discard 100::/64
  return false;
}
