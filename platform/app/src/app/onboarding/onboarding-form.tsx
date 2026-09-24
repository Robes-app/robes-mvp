'use client';

import { useApiClient } from '@robes/api-client/react';
import { onboarding as copy } from '@robes/copy';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Field, PrimaryButton } from '@/components/field';

export function OnboardingForm({ initialFirstName }: { initialFirstName: string }) {
  const router = useRouter();
  const api = useApiClient();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.call('me.update', { input: { firstName: firstName.trim() } });
      await api.call('me.onboarding.complete');
    } catch {
      setBusy(false);
      return setError(copy.failed);
    }
    setBusy(false);
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
