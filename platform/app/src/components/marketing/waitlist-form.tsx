'use client';

import { marketing } from '@robes/copy';
import { Button, ErrorText, Field, Heading, Text, useToast } from '@robes/ui';
import Script from 'next/script';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';

const copy = marketing.waitlist;
const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

const EMAIL_SHAPE = /.+@.+\..+/;

// Legacy landing (main 98ffb4b): a missing or malformed address is a toast, not a silent no.
export function emailProblem(value: string): string | null {
  const email = value.trim();
  if (!email) return copy.emailMissing;
  if (!EMAIL_SHAPE.test(email)) return copy.emailInvalid;
  return null;
}

function utmFromUrl(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(
    [...params.entries()].filter(([k]) => /^utm_[a-z]{1,20}$/.test(k)).slice(0, 5),
  );
}

// SEC-60 waitlist: Turnstile when configured; the same thank-you whatever the server knows.
export function WaitlistForm({ siteKey, nonce }: { siteKey: string | null; nonce: string | null }) {
  const toast = useToast();
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const problem = emailProblem(String(form.get('email') ?? ''));
    if (problem) {
      toast({ message: problem });
      event.currentTarget.querySelector<HTMLInputElement>('input[name="email"]')?.focus();
      return;
    }
    setState('sending');
    try {
      await api.call('public.waitlist.join', {
        input: {
          email: String(form.get('email') ?? ''),
          name: String(form.get('name') ?? '') || undefined,
          source: 'home',
          utm: utmFromUrl(),
          turnstileToken: String(form.get('cf-turnstile-response') ?? '') || undefined,
        },
      });
      setState('done');
    } catch {
      setState('failed');
    }
  }

  if (state === 'done') return <Text role="status">{copy.done}</Text>;
  return (
    <section aria-labelledby="waitlist" className="flex flex-col gap-4">
      <Heading id="waitlist" level={2} size="md">
        {copy.title}
      </Heading>
      <Text tone="muted">{copy.body}</Text>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <Field label={copy.emailLabel} name="email" type="email" autoComplete="email" required />
        <Field label={copy.nameLabel} name="name" autoComplete="given-name" maxLength={120} />
        {siteKey ? (
          <>
            <Script src={TURNSTILE_SCRIPT} async defer nonce={nonce ?? undefined} />
            <div className="cf-turnstile" data-sitekey={siteKey} />
          </>
        ) : null}
        {state === 'failed' ? <ErrorText>{copy.failed}</ErrorText> : null}
        <Button
          type="submit"
          variant="secondary"
          disabled={state === 'sending'}
          className="self-start"
        >
          {state === 'sending' ? copy.submitting : copy.submit}
        </Button>
      </form>
      <Text size="small" tone="muted" className="max-w-md">
        {copy.hint}
      </Text>
    </section>
  );
}
