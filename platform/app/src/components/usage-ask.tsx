'use client';

import type { Consents } from '@robes/contracts';
import { consent as copy } from '@robes/copy';
import { AlertDialog } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';

// One question answers all three switches (Annie, 19 Nov): usage counts, screen recordings and
// Share my looks. Each stays its own switch in You › Your data.
const answerAll = (yes: boolean) => ({ analytics: yes, full_recordings: yes, look_sharing: yes });

// Asked once in the signed-in app, while she has given no answer (null). Nothing is counted until
// she says yes (SEC-84). Native twin: AnalyticsSetup in mobile/src/lib/analytics.tsx.
//
// `current` is her answers as the signed-in layout read them. The root layout's analytics
// provider was rendered at sign-in, before there was a session, and a client navigation into the
// app never re-renders it: until a refresh it holds no user and no answers, so this asks from
// `current` and refreshes once, which hands the provider her id (or a yes would start nothing).
export function UsageAsk({ current }: { current: Consents }) {
  const { consents, updateConsents } = useAnalytics();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const stale = consents === null;
  useEffect(() => {
    if (stale) router.refresh();
  }, [stale, router]);
  async function answer(yes: boolean) {
    setBusy(true);
    await updateConsents(answerAll(yes));
    setBusy(false);
  }
  return (
    <AlertDialog
      open={(consents ?? current).analytics === null && !busy}
      title={copy.askTitle}
      message={copy.askBody}
      actions={[
        { label: copy.askYes, variant: 'primary', onClick: () => void answer(true) },
        { label: copy.askNo, variant: 'outline', onClick: () => void answer(false) },
      ]}
      // A question that must be answered: a tap outside or Escape leaves it open.
      onDismiss={() => {}}
    />
  );
}
