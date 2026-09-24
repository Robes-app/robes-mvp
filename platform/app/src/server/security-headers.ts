// connectOrigins: extra API/media origins the browser may call; the app itself is 'self'.
export function buildCsp(opts: {
  nonce: string;
  isDev: boolean;
  connectOrigins?: string[];
}): string {
  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    [
      'script-src',
      [
        "'self'",
        `'nonce-${opts.nonce}'`,
        "'strict-dynamic'",
        ...(opts.isDev ? ["'unsafe-eval'"] : []),
      ],
    ],
    // SSR style attributes can't carry nonces; script-src is the XSS control.
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:']],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...(opts.connectOrigins ?? [])]],
    ['frame-ancestors', ["'none'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
  ];
  const csp = directives.map(([k, v]) => `${k} ${v.join(' ')}`).join('; ');
  return opts.isDev ? csp : `${csp}; upgrade-insecure-requests`;
}
