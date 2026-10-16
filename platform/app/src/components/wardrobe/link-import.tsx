'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { wardrobe } from '@robes/copy';
import { Button, Field, SegmentedControl, Text } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { type FormEvent, useEffect, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

const copy = wardrobe.link;
const TERMINAL = ['succeeded', 'partial', 'failed', 'cancelled'];

// Paste a link (M3 task 9): the isolated fetcher reads the page; the result waits in the Inbox.
export function LinkImport() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [as, setAs] = useState<'wardrobe' | 'wishlist'>('wardrobe');
  const start = useApiMutation('imports.link');
  const jobId = start.data?.jobId;
  const job = useApi('jobs.get', jobId ? { params: { id: jobId } } : { params: { id: '' } }, {
    enabled: Boolean(jobId),
    refetchInterval: (q) =>
      q.state.data && TERMINAL.includes(q.state.data.status) ? false : 1_000,
  });
  const status = job.data?.status;

  useEffect(() => {
    if (status === 'succeeded') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('inbox.list') });
    }
  }, [status, queryClient]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    start.mutate({ input: { url: url.trim(), as } });
  }

  if (status === 'succeeded') {
    return (
      <div className="flex flex-col gap-3">
        <Text role="status">{copy.done}</Text>
        <Link href="/wardrobe/inbox" className="underline underline-offset-4">
          {copy.openInbox}
        </Link>
      </div>
    );
  }
  const reading = Boolean(jobId) && !TERMINAL.includes(status ?? 'queued');
  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <Field
        label={copy.label}
        name="url"
        type="url"
        inputMode="url"
        placeholder={copy.placeholder}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        maxLength={2048}
      />
      <SegmentedControl
        label={copy.as}
        value={as}
        onChange={setAs}
        options={[
          { value: 'wardrobe' as const, label: copy.toWardrobe },
          { value: 'wishlist' as const, label: copy.toWishlist },
        ]}
      />
      {start.isError ? (
        <Text role="alert" tone="danger">
          {errorCopy(start.error)}
        </Text>
      ) : null}
      {status === 'failed' ? (
        <Text role="alert" tone="danger">
          {copy.failed}
        </Text>
      ) : null}
      {reading ? <Text role="status">{copy.reading}</Text> : null}
      <Button
        type="submit"
        variant="primary"
        disabled={start.isPending || reading}
        className="self-start"
      >
        {start.isPending ? copy.starting : copy.start}
      </Button>
    </form>
  );
}
