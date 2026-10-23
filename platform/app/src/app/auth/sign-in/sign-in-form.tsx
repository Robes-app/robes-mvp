'use client';

import { auth as copy, you } from '@robes/copy';
import { Button, Eyebrow, Field, Heading, Text, Wordmark } from '@robes/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
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
          <Heading level={1}>{copy.codeTitle}</Heading>
          <Text tone="muted">{copy.codeSubtitle(email.trim())}</Text>
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
        <Button
          variant="primary"
          type="submit"
          disabled={code.length !== 6}
          loading={busy}
          loadingLabel={copy.verifying}
        >
          {copy.verify}
        </Button>
        <div className="flex justify-between">
          <Button variant="quiet" className="-mx-2" onClick={() => sendCode()}>
            {copy.resend}
          </Button>
          <Button
            variant="quiet"
            className="-mx-2"
            onClick={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
          >
            {copy.useDifferentEmail}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Wordmark />
        <Heading level={1} size="2xl">
          {copy.title}
        </Heading>
        <Text tone="muted">{copy.subtitle}</Text>
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
        <Button variant="primary" type="submit" loading={busy} loadingLabel={copy.sendingCode}>
          {copy.sendCode}
        </Button>
      </form>
      {providers.apple || providers.google ? (
        <div className="flex flex-col gap-3">
          <Eyebrow className="text-center">{copy.or}</Eyebrow>
          {providers.apple ? (
            <Button
              onClick={() => authClient.signIn.social({ provider: 'apple', callbackURL: next })}
            >
              {copy.apple}
            </Button>
          ) : null}
          {providers.google ? (
            <Button
              onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: next })}
            >
              {copy.google}
            </Button>
          ) : null}
        </div>
      ) : null}
      <Text size="caption" tone="faint">
        {copy.legal.lead}{' '}
        <Link href="/legal/terms" className="text-ink underline underline-offset-4">
          {you.legal.terms}
        </Link>{' '}
        {copy.legal.and}{' '}
        <Link href="/legal/privacy" className="text-ink underline underline-offset-4">
          {you.legal.privacyNotice}
        </Link>
        {copy.legal.end}
      </Text>
    </div>
  );
}
