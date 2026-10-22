'use client';

import { consent as copy } from '@robes/copy';
import { ErrorText } from '@robes/ui';
import { useId, useState } from 'react';
import { useAnalytics } from './analytics-provider';

const choice =
  'flex-1 rounded-pill border border-border-control bg-surface px-6 py-3 text-sm font-medium text-ink disabled:opacity-50';

// Two equal-weight choices; nothing loads until one is made (SEC-84).
export function ConsentBanner() {
  const { updateConsents } = useAnalytics();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const titleId = useId();

  async function answer(analytics: boolean) {
    setBusy(true);
    setFailed(false);
    const ok = await updateConsents({ analytics });
    setBusy(false);
    setFailed(!ok);
  }

  return (
    <section
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-soft border border-border-control border-b-0 bg-bg px-6 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl"
    >
      <div className="flex flex-col gap-4">
        <span aria-hidden className="mx-auto h-1 w-10 rounded-pill bg-border-control" />
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="font-display text-2xl font-light text-ink">
            {copy.bannerTitle}
          </h2>
          <p className="text-sm text-ink-muted">{copy.bannerBody}</p>
        </div>
        {failed ? <ErrorText>{copy.failed}</ErrorText> : null}
        <div className="flex gap-3">
          <button type="button" className={choice} disabled={busy} onClick={() => answer(false)}>
            {copy.decline}
          </button>
          <button type="button" className={choice} disabled={busy} onClick={() => answer(true)}>
            {copy.allow}
          </button>
        </div>
      </div>
    </section>
  );
}
