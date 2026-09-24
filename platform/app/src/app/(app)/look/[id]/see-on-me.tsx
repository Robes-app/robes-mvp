'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { you } from '@robes/copy';
import { Button, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { errorCopy } from '@/lib/error-copy';

const copy = you.model;

// Her look on her model: offered once she has one; the render becomes the look's image.
export function SeeOnMe({ look }: { look: Look }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const model = useApi('me.model.get');
  const render = useApiMutation('looks.renderOnModel', {
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: queryKeys.call('looks.get', { params: { id: look.id } }),
      }),
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  if (!model.data || look.pieces.length === 0) return null;
  if (!model.data.filed || model.data.cell.status !== 'ready') {
    return (
      <Link href="/you/model" className="self-start underline underline-offset-4">
        {copy.build}
      </Link>
    );
  }
  if (look.onModel === 'pending') {
    return (
      <Text role="status" tone="muted">
        {copy.dressing}
      </Text>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="secondary"
        className="self-start"
        loading={render.isPending}
        onClick={() => render.mutate({ params: { id: look.id } })}
      >
        {copy.seeOnMe}
      </Button>
      {look.onModel === 'failed' ? (
        <Text size="small" tone="muted">
          {copy.onMeFailed}
        </Text>
      ) : null}
    </div>
  );
}
