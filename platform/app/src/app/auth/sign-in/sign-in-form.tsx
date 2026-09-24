'use client';

import { auth as copy } from '@robes/copy';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Field, PrimaryButton, SecondaryButton } from '@/components/field';
import { authClient } from '@/lib/auth-client';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm({
  next,
  providers,
}: {
  next: string;
  providers: { apple: boolean; google: boolean };
}) {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (!EMAIL.test(email.trim())) return setError(copy.invalidEmail);
    setBusy(true);
    setError(null);
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: 'sign-in',
    });
    setBusy(false);
    if (sendError) return setError(copy.sendFailed);
    setStep('code');
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.emailOtp({
      email: email.trim(),
      otp: code.trim(),
    });
    setBusy(false);
    if (signInError) return setError(copy.invalidCode);
    router.replace(next);
    router.refresh();
  }

  if (step === 'code') {
    return (
      <form onSubmit={verify} className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-light text-ink">{copy.codeTitle}</h1>
          <p className="text-ink-muted">{copy.codeSubtitle(email.trim())}</p>
        </header>
        <Field
          label={copy.codeLabel}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          error={error}
        />
        <PrimaryButton type="submit" disabled={busy || code.length !== 6}>
          {busy ? copy.verifying : copy.verify}
        </PrimaryButton>
        <div className="flex justify-between text-sm text-ink-muted">
          <button type="button" className="underline underline-offset-4" onClick={() => sendCode()}>
            {copy.resend}
          </button>
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
          >
            {copy.useDifferentEmail}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-ink-muted">
          {copy.eyebrow}
        </p>
        <h1 className="font-display text-5xl font-light text-ink">{copy.title}</h1>
        <p className="text-ink-muted">{copy.subtitle}</p>
      </header>
      <form onSubmit={sendCode} className="flex flex-col gap-6" noValidate>
        <Field
          label={copy.emailLabel}
          name="email"
          type="email"
          autoComplete="email"
          placeholder={copy.emailPlaceholder}
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? copy.sendingCode : copy.sendCode}
        </PrimaryButton>
      </form>
      {providers.apple || providers.google ? (
        <div className="flex flex-col gap-3">
          <p className="text-center text-xs uppercase tracking-[0.18em] text-ink-faint">
            {copy.or}
          </p>
          {providers.apple ? (
            <SecondaryButton
              type="button"
              onClick={() => authClient.signIn.social({ provider: 'apple', callbackURL: next })}
            >
              {copy.apple}
            </SecondaryButton>
          ) : null}
          {providers.google ? (
            <SecondaryButton
              type="button"
              onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: next })}
            >
              {copy.google}
            </SecondaryButton>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-ink-faint">{copy.legal}</p>
    </div>
  );
}
