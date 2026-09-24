'use client';

import { onboarding as copy } from '@robes/copy';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Field, PrimaryButton } from '@/components/field';

export function OnboardingForm({ initialFirstName }: { initialFirstName: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const json = { 'content-type': 'application/json' };
    const saved = await fetch('/api/v1/me', {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ firstName: firstName.trim() }),
    });
    const done = saved.ok
      ? await fetch('/api/v1/me/onboarding/complete', { method: 'POST' })
      : saved;
    setBusy(false);
    if (!done.ok) return setError(copy.failed);
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-ink-muted">
          {copy.eyebrow}
        </p>
        <h1 className="font-display text-4xl font-light text-ink">{copy.title}</h1>
      </header>
      <Field
        label={copy.firstNameLabel}
        name="firstName"
        autoComplete="given-name"
        required
        maxLength={60}
        autoFocus
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        error={error}
      />
      <PrimaryButton type="submit" disabled={busy || firstName.trim().length === 0}>
        {busy ? copy.saving : copy.continue}
      </PrimaryButton>
    </form>
  );
}
