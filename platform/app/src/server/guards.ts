// Signed-out visitors are sent to sign-in from these; signed-in visitors skip the auth pages.
export const PROTECTED_PREFIXES = [
  '/onboarding',
  '/wardrobe',
  '/piece',
  '/looks',
  '/look',
  '/ideas',
  '/plan',
  '/day',
  '/trip',
  '/you',
  '/dev',
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isAuthPage(pathname: string): boolean {
  return pathname === '/auth' || pathname.startsWith('/auth/');
}

// Only same-site relative paths may be used as a post-sign-in destination (no open redirects).
export function safeNext(value: string | null | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}
