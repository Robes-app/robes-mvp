'use client';

import { useApiMutation } from '@robes/api-client/react';
import { wardrobe } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { Icon } from '@robes/icons/web';
import { Button, ErrorText, Eyebrow, Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { PinnedAction } from '@/components/pinned-action';
import type { AddDestination } from '@/lib/add-flow';
import { errorCopy } from '@/lib/error-copy';
import { useJob } from '@/lib/use-job';

const copy = wardrobe.add.link;

// Paste a link (design "Add Piece — Handoff", redline 04): the URL field with Paste inside it
// (the link is almost always on the clipboard) and a clear ×, one line on where the piece goes
// (chosen on the Add pieces sheet), and "Read the page" pinned at the foot. The isolated fetcher
// reads the page (SEC-40), then Review opens on the piece — nothing files before it; a page that
// can't be read keeps her here. Native twin: features/wardrobe/LinkImport.tsx.
export function LinkImport({ initial: to }: { initial: AddDestination }) {
  const router = useRouter();
  const inputId = useId();
  const field = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [canPaste, setCanPaste] = useState(false);
  const start = useApiMutation('imports.link');
  const { job, connection } = useJob(start.data?.jobId ?? null);
  const settled = !!job && isTerminalJobStatus(job.status);
  const inboxId = job?.status === 'succeeded' ? job.output.inboxId : undefined;
  const failed = (settled && !inboxId) || connection === 'unavailable';
  const reading = start.isPending || (!!start.data && !settled && !failed);

  // Paste needs the clipboard API; without it the field takes the keyboard's own paste.
  useEffect(() => setCanPaste(typeof navigator.clipboard?.readText === 'function'), []);

  useEffect(() => {
    if (inboxId) router.replace(`/wardrobe/review?to=${to}&link=${inboxId}`);
  }, [inboxId, router, to]);

  async function paste() {
    const text = (await navigator.clipboard.readText().catch(() => '')).trim();
    if (text) setUrl(text);
    else field.current?.focus();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (url.trim()) start.mutate({ input: { url: url.trim(), as: to } });
  }

  const empty = url.trim() === '';
  return (
    <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-md flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Heading level={1} size="lg">
          {copy.title} <em>{copy.wink}</em>
        </Heading>
      </header>
      <div className="flex flex-col gap-2">
        <label
          htmlFor={inputId}
          className="font-sans text-ink-faint text-xs uppercase tracking-[0.22em]"
        >
          {copy.label}
        </label>
        <div className="flex min-h-12 items-center rounded-crisp border border-hairline bg-surface-raised pl-4 focus-within:border-ink-muted focus-within:outline-2 focus-within:outline-focus-ring focus-within:outline-offset-2">
          <input
            ref={field}
            id={inputId}
            name="url"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={copy.placeholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={2048}
            className="min-w-0 flex-1 bg-transparent py-3 font-sans text-base text-ink outline-none placeholder:text-ink-faint"
          />
          {empty ? (
            canPaste ? (
              <button
                type="button"
                onClick={() => void paste()}
                className="mr-1 inline-flex min-h-11 items-center px-2"
              >
                <span className="rounded-pill border border-hairline bg-surface-raised px-3 py-1 font-sans text-ink text-xs">
                  {copy.paste}
                </span>
              </button>
            ) : null
          ) : (
            <button
              type="button"
              aria-label={copy.clear}
              onClick={() => {
                setUrl('');
                field.current?.focus();
              }}
              className="inline-flex size-11 items-center justify-center text-ink-faint hover:text-ink"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      </div>
      <Text size="small" tone="muted">
        {copy.filingTo[to]} ·{' '}
        <Link
          href={`/wardrobe/add?to=${to}`}
          className="text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          {copy.change}
        </Link>
      </Text>
      {start.isError ? (
        <ErrorText>{errorCopy(start.error)}</ErrorText>
      ) : failed ? (
        <p role="alert" className="font-sans text-ink-muted text-sm">
          {copy.failed}{' '}
          <button
            type="button"
            onClick={() => field.current?.focus()}
            className="text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            {copy.fixIt}
          </button>
          {' · '}
          <Link
            href={`/wardrobe/manual?to=${to}`}
            className="text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            {wardrobe.add.review.fillIn}
          </Link>
        </p>
      ) : null}
      <PinnedAction>
        <Button
          type="submit"
          variant="primary"
          block
          disabled={empty || reading}
          loading={reading}
          loadingLabel={copy.reading}
        >
          {copy.read}
        </Button>
      </PinnedAction>
    </form>
  );
}
