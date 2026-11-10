'use client';

import { type Analytics, noopAnalytics } from '@robes/analytics';
import { type BrowserAnalyticsConfig, createBrowserAnalytics } from '@robes/analytics/browser';
import type { Consents, UpdateConsentsInput } from '@robes/contracts';
import { usePathname } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

type ConsentChange = UpdateConsentsInput['consents'];

interface AnalyticsContextValue {
  analytics: Analytics;
  consents: Consents | null;
  updateConsents(change: ConsentChange): Promise<boolean>;
  // Forget the analytics identity (sign-out).
  forget(): void;
}

const AnalyticsContext = createContext<AnalyticsContextValue>({
  analytics: noopAnalytics,
  consents: null,
  updateConsents: async () => false,
  forget: () => {},
});

export function useAnalytics(): AnalyticsContextValue {
  return useContext(AnalyticsContext);
}

// SEC-84: PostHog loads only once she turns usage counts on in You › Privacy, and is torn down
// when she turns them off. Nothing asks for it on a page.
export function AnalyticsProvider({
  config,
  userId,
  initialConsents,
  children,
}: {
  config: BrowserAnalyticsConfig | null;
  userId: string | null;
  initialConsents: Consents | null;
  children: ReactNode;
}) {
  const key = config?.key;
  const host = config?.host;
  const environment = config?.environment;
  const browser = useMemo(
    () => (key && host && environment ? createBrowserAnalytics({ key, host, environment }) : null),
    [key, host, environment],
  );
  const [consents, setConsents] = useState(initialConsents);
  const [synced, setSynced] = useState(initialConsents);
  if (synced !== initialConsents) {
    setSynced(initialConsents);
    setConsents(initialConsents);
  }
  const [live, setLive] = useState(false);
  const pathname = usePathname();

  const analyticsOn = Boolean(browser && userId && consents?.analytics === true);
  const replayOn = consents?.replay === true;

  useEffect(() => {
    if (!browser) return;
    if (!analyticsOn || !userId) {
      browser.stop();
      setLive(false);
      return;
    }
    let cancelled = false;
    browser.start({ userId, replay: replayOn }).then(
      () => !cancelled && setLive(true),
      () => !cancelled && setLive(false),
    );
    return () => {
      cancelled = true;
    };
  }, [browser, analyticsOn, replayOn, userId]);

  useEffect(() => {
    if (live && pathname) browser?.track('$pageview');
  }, [browser, live, pathname]);

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      analytics: browser ?? noopAnalytics,
      consents,
      async updateConsents(change) {
        const res = await fetch('/api/v1/me/consents', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ source: 'web', consents: change }),
        });
        if (!res.ok) return false;
        setConsents((await res.json()) as Consents);
        return true;
      },
      forget() {
        browser?.stop();
        setLive(false);
      },
    }),
    [browser, consents],
  );

  return <AnalyticsContext value={value}>{children}</AnalyticsContext>;
}
