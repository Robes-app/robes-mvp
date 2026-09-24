const IP_HEADERS = ['x-vercel-forwarded-for', 'x-forwarded-for', 'x-real-ip'] as const;

export function clientIp(req: Request): string {
  for (const name of IP_HEADERS) {
    const first = req.headers.get(name)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}
