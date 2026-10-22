'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { you } from '@robes/copy';
import { Button, Heading, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

const copy = you.receipts;

// Her forwarding address for receipts: copy it, replace it, or turn it off.
export function ForwardReceipts() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [off, setOff] = useState(false);
  const address = useApi('me.inboxAddress.get', undefined, { enabled: !off });
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

  async function copyAddress(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ message: copy.copied });
    } catch {
      toast({ message: copy.copyFailed(text) });
    }
  }

  return (
    <section aria-labelledby="you-receipts" className="flex flex-col gap-2">
      <Heading level={2} size="sm" id="you-receipts">
        {copy.title}
      </Heading>
      <Text size="small" tone="muted">
        {copy.body}
      </Text>
      {value ? (
        <>
          <Text className="break-all font-mono" data-testid="inbox-address">
            {value}
          </Text>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void copyAddress(value)}>
              {copy.copy}
            </Button>
            <Button
              variant="quiet"
              loading={regenerate.isPending}
              onClick={() => regenerate.mutate({})}
            >
              {copy.regenerate}
            </Button>
          </div>
          {/* Destructive, so on its own line, away from Copy. */}
          <Button
            variant="quiet"
            className="self-start"
            loading={revoke.isPending}
            onClick={() => revoke.mutate({})}
          >
            {copy.turnOff}
          </Button>
        </>
      ) : off ? (
        <Button variant="secondary" className="self-start" onClick={() => setOff(false)}>
          {copy.turnOn}
        </Button>
      ) : null}
    </section>
  );
}
