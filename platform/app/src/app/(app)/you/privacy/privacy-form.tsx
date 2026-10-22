'use client';

import type { UpdateConsentsInput } from '@robes/contracts';
import { consent as copy } from '@robes/copy';
import { ErrorText, Switch } from '@robes/ui';
import { useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';

type Change = UpdateConsentsInput['consents'];

export function PrivacyForm() {
  const { consents, updateConsents } = useAnalytics();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  // Shown immediately while saving; the server's answer replaces it.
  const [draft, setDraft] = useState<Change | null>(null);
  const shown = { ...consents, ...draft };
  const analytics = shown.analytics === true;

  async function save(change: Change) {
    setDraft(change);
    setStatus('saving');
    const ok = await updateConsents(change);
    setDraft(null);
    setStatus(ok ? 'saved' : 'failed');
  }

  return (
    <div className="flex flex-col gap-6">
      <Switch
        label={copy.analyticsLabel}
        hint={copy.analyticsHint}
        checked={analytics}
        disabled={status === 'saving'}
        onChange={(on) => save({ analytics: on })}
      />
      <Switch
        label={copy.replayLabel}
        hint={copy.replayHint}
        checked={analytics && shown.replay === true}
        disabled={status === 'saving' || !analytics}
        onChange={(on) => save({ replay: on })}
      />
      <p role="status" className="min-h-5 text-sm text-ink-muted">
        {status === 'saving' ? copy.saving : status === 'saved' ? copy.saved : ''}
      </p>
      {status === 'failed' ? <ErrorText>{copy.failed}</ErrorText> : null}
    </div>
  );
}
