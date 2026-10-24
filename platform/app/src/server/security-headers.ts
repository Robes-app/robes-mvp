import type { MediaConfig, ObservabilityConfig } from '@robes/config';

// Extra origins beyond 'self': imgOrigins serve media, connectOrigins take fetches (e.g. upload PUTs).
export function buildCsp(opts: {
  nonce: string;
  isDev: boolean;
  connectOrigins?: string[];
  imgOrigins?: string[];
  // Cloudflare Turnstile renders its challenge in an iframe from this origin.
  frameOrigins?: string[];
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
    ['img-src', ["'self'", 'data:', 'blob:', ...(opts.imgOrigins ?? [])]],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...(opts.connectOrigins ?? [])]],
    ['frame-src', ["'self'", ...(opts.frameOrigins ?? [])]],
    ['frame-ancestors', ["'none'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
  ];
  const csp = directives.map(([k, v]) => `${k} ${[...new Set(v)].join(' ')}`).join('; ');
  return opts.isDev ? csp : `${csp}; upgrade-insecure-requests`;
}

// Media serves images and takes upload PUTs; PostHog origins appear only when configured.
export const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

export function cspSources(
  media: Pick<MediaConfig, 'deliveryOrigin' | 'uploadOrigin'>,
  observability: Pick<ObservabilityConfig, 'connectOrigins'>,
  turnstile: boolean = false,
): { imgOrigins: string[]; connectOrigins: string[]; frameOrigins: string[] } {
  const delivery = media.deliveryOrigin ? [media.deliveryOrigin] : [];
  return {
    imgOrigins: delivery,
    connectOrigins: [...delivery, media.uploadOrigin, ...observability.connectOrigins],
    frameOrigins: turnstile ? [TURNSTILE_ORIGIN] : [],
  };
}
