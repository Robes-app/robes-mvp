'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { DataExport } from '@robes/contracts';
import { you } from '@robes/copy';
import { Button, buttonClasses, Heading, Text } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';

const copy = you.dataExport;
const REFRESH_MS = 3_000;
const pending = (e: DataExport | null | undefined) =>
  e?.status === 'requested' || e?.status === 'running';

// SEC-81: request → preparing → a short-lived download link (refetch for a fresh one).
export function DownloadData() {
  const queryClient = useQueryClient();
  const status = useApi('me.exports.get', undefined, {
    refetchInterval: (q) => (pending(q.state.data?.export) ? REFRESH_MS : false),
  });
  const request = useApiMutation('me.exports.request', {
    onSuccess: (data) =>
      queryClient.setQueryData(queryKeys.call('me.exports.get'), { export: data }),
  });
  const current = status.data?.export ?? null;
  const canRequest = !current || current.status === 'expired' || current.status === 'failed';

  return (
    <section aria-labelledby="you-data" className="flex flex-col gap-2">
      <Heading level={2} size="sm" id="you-data">
        {copy.title}
      </Heading>
      <Text size="small" tone="muted">
        {copy.body}
      </Text>
      {/* Announced politely; not a second status region beside the consents' "Saved." */}
      <div aria-live="polite" className="flex flex-col items-start gap-2">
        {pending(current) ? <Text size="small">{copy.preparing}</Text> : null}
        {current?.status === 'failed' ? <Text size="small">{copy.failed}</Text> : null}
        {current?.status === 'expired' ? <Text size="small">{copy.expired}</Text> : null}
        {current?.status === 'ready' && current.downloadUrl ? (
          <>
            <Text size="small">{copy.ready}</Text>
            <a
              href={current.downloadUrl}
              className={buttonClasses({ variant: 'secondary' })}
              download
            >
              {copy.download}
            </a>
          </>
        ) : null}
      </div>
      {canRequest ? (
        <Button
          variant="secondary"
          className="self-start"
          loading={request.isPending}
          loadingLabel={copy.requesting}
          onClick={() => request.mutate({})}
        >
          {current ? copy.again : copy.request}
        </Button>
      ) : null}
    </section>
  );
}
