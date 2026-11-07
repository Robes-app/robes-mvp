import { nativeAnalytics } from './analytics';
import { api } from './api';
import { APP_VERSION } from './config';

// Each failure is reported once, however often a screen re-renders it.
const reported = new WeakSet<object>();

// A failure the app met: to PostHog when analytics run, and always to the server's log
// (POST /me/client-errors), so it is seen even when PostHog is off. Never throws.
export function report(err: unknown, where: string): void {
  if (err && typeof err === 'object') {
    if (reported.has(err)) return;
    reported.add(err);
  }
  nativeAnalytics.reportError(err);
  const e = err instanceof Error ? err : new Error(String(err));
  void api
    .call('me.clientErrors.report', {
      input: {
        where: where.slice(0, 60),
        name: e.name.slice(0, 60),
        message: e.message.slice(0, 300),
        appVersion: APP_VERSION,
        analytics: nativeAnalytics.isActive(),
      },
    })
    .catch(() => undefined);
}
