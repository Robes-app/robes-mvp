'use client';

import { UNRECORDED } from '@robes/analytics';
import { useApiClient } from '@robes/api-client/react';
import { auth as copy, you } from '@robes/copy';
import { signUpFirstName } from '@robes/core/auth';
import { Button, Field, Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inlineLink = 'text-ink underline underline-offset-[3px] hover:text-ink-muted';
const textLink = `cursor-pointer ${inlineLink}`;

// Sign in and sign up are one email code (design "Sign in and sign up", 18 Nov); sign up also
// asks her first name, saved once the code is verified. The web offers Google beside the code.
// Native twin: mobile/src/features/auth/AuthScreen.tsx.
export function AuthForm({
  mode,
  next,
  google,
}: {
  mode: 'sign-in' | 'sign-up';
  next: string;
  google: boolean;
}) {
  const router = useRouter();
  const api = useApiClient();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const other = mode === 'sign-in' ? '/auth/sign-up' : '/auth/sign-in';
  const otherHref = next === '/' ? other : `${other}?next=${encodeURIComponent(next)}`;

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
    if (signInError) {
      setBusy(false);
      return setError(copy.invalidCode);
    }
    if (mode === 'sign-up' && name.trim()) {
      // She is signed in either way; a name that didn't save is asked again in onboarding.
      try {
        const me = await api.call('me.get');
        const firstName = signUpFirstName(name, me.firstName);
        if (firstName) await api.call('me.update', { input: { firstName } });
      } catch {
        // Onboarding's name step is still ahead of her.
      }
    }
    setBusy(false);
    router.replace(next);
    router.refresh();
  }

  function changeEmail() {
    setStep('email');
    setCode('');
    setError(null);
  }

  if (step === 'code') {
    return (
      <form onSubmit={verify} className="flex flex-col gap-7">
        <header className="flex flex-col gap-3">
          <Heading level={1} size="2xl">
            {copy.codeTitle}
          </Heading>
          {/* Her email and the code never show in a screen recording. */}
          <Text italic tone="muted" className={UNRECORDED}>
            {copy.codeSubtitle(email.trim())}
          </Text>
        </header>
        <div className="flex flex-col gap-4">
          <Field
            label={copy.codeLabel}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            className={UNRECORDED}
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
            block
            disabled={code.length !== 6}
            loading={busy}
            loadingLabel={copy.verifying}
          >
            {copy.verify}
          </Button>
        </div>
        <Text size="small" tone="muted" className="text-center">
          {copy.notArrived.lead}{' '}
          <button type="button" className={textLink} onClick={() => sendCode()}>
            {copy.notArrived.link}
          </button>
          {copy.notArrived.end}
        </Text>
        <Text size="small" tone="muted" className="text-center">
          {copy.wrongEmail.lead}{' '}
          <button type="button" className={textLink} onClick={changeEmail}>
            {copy.wrongEmail.link}
          </button>
        </Text>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-3">
        <Heading level={1} size="2xl">
          {mode === 'sign-in' ? copy.title : copy.signUpTitle}
        </Heading>
        <Text italic tone="muted">
          {copy.subtitle}
        </Text>
      </header>
      <form onSubmit={sendCode} className="flex flex-col gap-4" noValidate>
        <Field
          label={copy.emailLabel}
          name="email"
          type="email"
          className={UNRECORDED}
          autoComplete="email"
          placeholder={copy.emailPlaceholder}
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        {mode === 'sign-up' ? (
          <Field
            label={copy.firstNameLabel}
            name="firstName"
            autoComplete="given-name"
            placeholder={copy.firstNamePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        ) : null}
        <Button
          variant="primary"
          type="submit"
          block
          loading={busy}
          loadingLabel={copy.sendingCode}
        >
          {copy.sendCode}
        </Button>
      </form>
      {google ? (
        <>
          <div aria-hidden="true" className="flex items-center gap-3.5">
            <span className="h-px flex-1 bg-rule-mid" />
            <span className="type-eyebrow text-ink-faint">{copy.or}</span>
            <span className="h-px flex-1 bg-rule-mid" />
          </div>
          <Button
            block
            className="min-h-13"
            onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: next })}
          >
            {copy.google}
          </Button>
        </>
      ) : null}
      <Text size="caption" tone="muted" className="text-center">
        {mode === 'sign-in' ? copy.legal.lead : copy.legal.signUpLead}{' '}
        <Link href="/legal/terms" className={inlineLink}>
          {you.legal.terms}
        </Link>{' '}
        {copy.legal.and}{' '}
        <Link href="/legal/privacy" className={inlineLink}>
          {you.legal.privacyNotice}
        </Link>
        {copy.legal.end}
      </Text>
      <Text size="small" tone="muted" className="text-center">
        {mode === 'sign-in' ? copy.toSignUp.lead : copy.toSignIn.lead}{' '}
        <Link href={otherHref} className={inlineLink}>
          {mode === 'sign-in' ? copy.toSignUp.link : copy.toSignIn.link}
        </Link>
      </Text>
    </div>
  );
}
