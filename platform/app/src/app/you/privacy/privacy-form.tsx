'use client';

import type { UpdateConsentsInput } from '@robes/contracts';
import { consent as copy } from '@robes/copy';
import { useId, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';

type Change = UpdateConsentsInput['consents'];

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange(next: boolean): void;
}) {
  const hintId = useId();
  return (
    <label className="flex items-start justify-between gap-6">
      <span className="flex flex-col gap-1">
        <span className="text-base text-ink">{label}</span>
        <span id={hintId} className="text-sm text-ink-muted">
          {hint}
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-describedby={hintId}
        className="mt-1 size-5 accent-ink"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

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
      <Toggle
        label={copy.analyticsLabel}
        hint={copy.analyticsHint}
        checked={analytics}
        disabled={status === 'saving'}
        onChange={(on) => save({ analytics: on })}
      />
      <Toggle
        label={copy.replayLabel}
        hint={copy.replayHint}
        checked={analytics && shown.replay === true}
        disabled={status === 'saving' || !analytics}
        onChange={(on) => save({ replay: on })}
      />
      <p role="status" className="min-h-5 text-sm text-ink-muted">
        {status === 'saving' ? copy.saving : status === 'saved' ? copy.saved : ''}
      </p>
      {status === 'failed' ? (
        <p role="alert" className="text-sm text-danger">
          {copy.failed}
        </p>
      ) : null}
    </div>
  );
}
