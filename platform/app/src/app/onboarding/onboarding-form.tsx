'use client';

import { useApiClient } from '@robes/api-client/react';
import { onboarding as copy } from '@robes/copy';
import { Button, Eyebrow, Field, Heading } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

type Step = 'name' | 'piece';

// Two screens after auth (UX-22): her name, then a first piece that lands on its styled result.
export function OnboardingForm({ initialFirstName }: { initialFirstName: string }) {
  const router = useRouter();
  const api = useApiClient();
  const [step, setStep] = useState<Step>('name');
  const [firstName, setFirstName] = useState(initialFirstName);
  const [piece, setPiece] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'style' | 'skip' | null>(null);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    setBusy('save');
    setError(null);
    try {
      await api.call('me.update', { input: { firstName: firstName.trim() } });
      setStep('piece');
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(null);
    }
  }

  async function finish(style: boolean) {
    setBusy(style ? 'style' : 'skip');
    setError(null);
    try {
      const job = style
        ? await api.call('looks.generate', {
            input: { anchor: { type: 'text', text: piece.trim() } },
          })
        : null;
      await api.call('me.onboarding.complete');
      router.replace(job ? `/looks/style/${job.jobId}` : '/');
      router.refresh();
    } catch {
      setBusy(null);
      setError(copy.failed);
    }
  }

  if (step === 'piece') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void finish(true);
        }}
        className="flex flex-col gap-8"
      >
        <header className="flex flex-col gap-2">
          <Eyebrow>{copy.pieceEyebrow}</Eyebrow>
          <Heading level={1}>{copy.pieceTitle}</Heading>
        </header>
        <Field
          label={copy.pieceLabel}
          name="piece"
          placeholder={copy.piecePlaceholder}
          required
          minLength={2}
          maxLength={300}
          autoFocus
          value={piece}
          onChange={(e) => setPiece(e.target.value)}
          error={error}
        />
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            type="submit"
            disabled={piece.trim().length < 2 || busy !== null}
            loading={busy === 'style'}
          >
            {copy.pieceStart}
          </Button>
          <Button
            variant="quiet"
            disabled={busy !== null}
            loading={busy === 'skip'}
            onClick={() => finish(false)}
          >
            {copy.skip}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={saveName} className="flex flex-col gap-8">
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
        loading={busy === 'save'}
        loadingLabel={copy.saving}
      >
        {copy.continue}
      </Button>
    </form>
  );
}
