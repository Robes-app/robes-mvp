'use client';

import { consent as copy } from '@robes/copy';
import { AlertDialog } from '@robes/ui';
import { useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';

// One question answers all three switches (Annie, 19 Nov): usage counts, screen recordings and
// Share my looks. Each stays its own switch in You › Your data.
const answerAll = (yes: boolean) => ({ analytics: yes, recordings: yes, look_sharing: yes });

// Asked once in the signed-in app, while she has given no answer (null). Nothing is counted until
// she says yes (SEC-84). Native twin: AnalyticsSetup in mobile/src/lib/analytics.tsx.
export function UsageAsk() {
  const { consents, updateConsents } = useAnalytics();
  const [busy, setBusy] = useState(false);
  async function answer(yes: boolean) {
    setBusy(true);
    await updateConsents(answerAll(yes));
    setBusy(false);
  }
  return (
    <AlertDialog
      open={consents?.analytics === null && !busy}
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
