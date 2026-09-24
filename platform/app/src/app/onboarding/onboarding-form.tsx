'use client';

import { useApiClient } from '@robes/api-client/react';
import { onboarding as copy } from '@robes/copy';
import { Button, Eyebrow, Field, Heading } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

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
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Heading level={1}>{copy.title}</Heading>
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
      <Button
        variant="primary"
        type="submit"
        disabled={firstName.trim().length === 0}
        loading={busy}
        loadingLabel={copy.saving}
      >
        {copy.continue}
      </Button>
    </form>
  );
}
