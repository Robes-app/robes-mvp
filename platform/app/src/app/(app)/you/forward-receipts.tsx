'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { you } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Button, Eyebrow, Heading, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

const copy = you.receipts;

// Her forwarding address (legacy _showMailStep): the eyebrow, the heading, and the address card
// as THE one action — a tap copies it. Replacing it and turning it off are quiet beneath, and
// there is no "Open Mail": opening a blank mail read wrong. As the add flow's door (`door`), it is
// the card and the three steps alone (design "Add Piece — Handoff"). Native twin:
// features/you/ForwardReceipts.tsx.
export function ForwardReceipts({ door = false }: { door?: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [off, setOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const address = useApi('me.inboxAddress.get', undefined, { enabled: !off });
  const held = useApi('inbox.list', undefined, { enabled: !off });
  const key = queryKeys.call('me.inboxAddress.get');
  const regenerate = useApiMutation('me.inboxAddress.regenerate', {
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
      toast({ message: copy.regenerated });
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const revoke = useApiMutation('me.inboxAddress.revoke', {
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: key });
      setOff(true);
      toast({ message: copy.turnedOff });
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const value = off ? null : (address.data?.address ?? null);
  const waiting = off ? 0 : (held.data?.count ?? 0);

  async function copyAddress(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ message: copy.copyFailed(text) });
    }
  }

  return (
    <section aria-labelledby="you-receipts" className="flex flex-col gap-3">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <Heading level={door ? 1 : 2} size={door ? 'lg' : 'md'} id="you-receipts">
        {copy.heading}
      </Heading>
      {value ? (
        <>
          {/* The card is the action: one tap copies, and it says so for two seconds. */}
          <button
            type="button"
            onClick={() => void copyAddress(value)}
            className={`flex min-h-11 flex-wrap items-center justify-between gap-3 rounded-soft border px-4 py-3 text-left hover:border-ink focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2 ${copied ? 'border-selected-line bg-selected' : 'border-hairline bg-surface'}`}
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-sans text-ink-faint text-xs uppercase tracking-[0.18em]">
                {copy.addressLabel}
              </span>
              <span className="break-all font-mono text-ink text-sm" data-testid="inbox-address">
                {value}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 font-sans text-ink-muted text-sm">
              <Icon name={copied ? 'check' : 'link'} size={14} />
              {copied ? copy.copied : copy.copy}
            </span>
          </button>
          <ol className="flex flex-col gap-2">
            {copy.steps.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="font-display text-ink-faint text-sm">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Text size="small" tone="muted">
                  {step}
                </Text>
              </li>
            ))}
          </ol>
          {waiting > 0 ? (
            <Text size="small" tone="muted">
              {copy.waiting(waiting)} ·{' '}
              <Link href="/wardrobe/inbox" className="underline">
                {copy.review}
              </Link>
            </Text>
          ) : null}
          {door ? null : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="quiet"
                loading={regenerate.isPending}
                onClick={() => regenerate.mutate({})}
              >
                {copy.regenerate}
              </Button>
              {/* Destructive, so it keeps its distance from the card. */}
              <Button variant="quiet" loading={revoke.isPending} onClick={() => revoke.mutate({})}>
                {copy.turnOff}
              </Button>
            </div>
          )}
        </>
      ) : off ? (
        <Button variant="secondary" className="self-start" onClick={() => setOff(false)}>
          {copy.turnOn}
        </Button>
      ) : (
        <Text size="small" tone="muted">
          {copy.settingUp}
        </Text>
      )}
    </section>
  );
}
