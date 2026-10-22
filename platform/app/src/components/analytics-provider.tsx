'use client';

import { type Analytics, noopAnalytics } from '@robes/analytics';
import { type BrowserAnalyticsConfig, createBrowserAnalytics } from '@robes/analytics/browser';
import { useApi } from '@robes/api-client/react';
import type { Consents, UpdateConsentsInput } from '@robes/contracts';
import { usePathname } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { ConsentBanner } from './consent-banner';

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

// SEC-84: PostHog loads only after analytics consent and is torn down when it is withdrawn.
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
  const browser = useMemo(
    () => (key && host ? createBrowserAnalytics({ key, host }) : null),
    [key, host],
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

  // Asked after her first real moment (a piece filed), so the ask has something to stand on;
  // never during onboarding, nor on the page that already offers the same choice.
  const unanswered = userId !== null && consents?.analytics === null;
  const summary = useApi('wardrobe.summary', undefined, { enabled: unanswered });
  const asking =
    unanswered &&
    (summary.data?.total ?? 0) > 0 &&
    !pathname.startsWith('/onboarding') &&
    pathname !== '/you/privacy';

  return (
    <AnalyticsContext value={value}>
      {children}
      {asking ? <ConsentBanner /> : null}
    </AnalyticsContext>
  );
}
