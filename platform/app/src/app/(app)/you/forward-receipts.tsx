'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { you } from '@robes/copy';
import { splitAddress } from '@robes/core/inbox';
import { Icon } from '@robes/icons/web';
import { Button, Eyebrow, Heading, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

const copy = you.receipts;

// Her forwarding address (legacy _showMailStep): the eyebrow, the heading, and the address card —
// a rose eyebrow, the address broken only at the @, and one hairline "Copy address" pill that
// reads "Copied" for two seconds (Add Piece redline 05). Replacing it and turning it off are
// quiet beneath, and there is no "Open Mail": opening a blank mail read wrong. As the add flow's
// door (`door`), it is the card and the three steps alone (design "Add Piece — Handoff"). Native
// twin: features/you/ForwardReceipts.tsx.
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
          <div className="flex flex-col gap-3 rounded-soft border border-hairline bg-surface-raised px-4 py-4">
            <span className="font-sans text-[9px] text-accent-warm uppercase tracking-[0.24em]">
              {copy.addressLabel}
            </span>
            <AddressLines address={value} />
            <button
              type="button"
              onClick={() => void copyAddress(value)}
              className="relative inline-flex h-9 items-center gap-1.5 self-start rounded-pill border border-rule-mid bg-surface-raised px-4 font-sans text-ink text-xs after:absolute after:-inset-y-1 after:inset-x-0 hover:border-border-control focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
            >
              <Icon name={copied ? 'check' : 'link'} size={14} />
              <span aria-live="polite">{copied ? copy.copied : copy.copy}</span>
            </button>
          </div>
          <ol className="flex flex-col gap-2">
            {copy.steps.map((step, i) => (
              <li key={step} className="flex items-baseline gap-3">
                <span className="font-sans text-[9px] text-ink-faint tracking-[0.2em]">
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
              <Link href="/wardrobe/inbox" className="underline underline-offset-4">
                {copy.review(waiting)}
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

// Line one is the local part, line two "@in.…": an address only ever breaks at the @, and a
// very narrow screen falls back to breaking anywhere rather than overflowing.
function AddressLines({ address }: { address: string }) {
  const { local, domain } = splitAddress(address);
  return (
    <span
      className="flex flex-col font-normal font-sans text-[15px] text-ink leading-snug [overflow-wrap:anywhere]"
      data-testid="inbox-address"
    >
      <span>{local}</span>
      {domain ? <span>{domain}</span> : null}
    </span>
  );
}
