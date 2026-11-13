'use client';

import { queryKeys, useApiMutation } from '@robes/api-client/react';
import type { Model } from '@robes/contracts';
import { twin } from '@robes/copy';
import { AlertDialog, Button, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

const copy = twin.twinPage.deleteTwin;

// Whether anything of her twin is on file: her close-up, a twin drawn, or one drawing.
export const hasTwinOnFile = (model: Model): boolean =>
  model.closeUpUrl !== null || model.twin.imageUrl !== null || model.twin.status === 'pending';

// Delete my digital twin (design "Your model · Delete twin", Annie 12 Nov): under the lineup,
// once anything of her twin is on file; while it is being built it names the photograph. One
// question, then her looks stand on a Robes model and the photographs go (me.model.twin.delete).
// Native twin: mobile/src/features/you/DeleteTwin.tsx.
export function DeleteTwin({ building }: { building: boolean }) {
  const [asking, setAsking] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const remove = useApiMutation('me.model.twin.delete', {
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.call('me.model.get'), data);
      for (const route of ['me.style.get', 'me.dna.get', 'me.consents.get', 'today.get'] as const) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.route(route) });
      }
      // A read still in flight answers to a photograph that is gone: stop waiting on it.
      router.replace(pathname);
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  return (
    <div className="flex flex-col items-center gap-2.5 border-hairline border-t pt-[22px]">
      <Button
        variant="outline"
        disabled={remove.isPending}
        onClick={() => setAsking(true)}
        data-testid="twin-delete"
      >
        {building ? copy.photo : copy.twin}
      </Button>
      <Text size="caption" tone="muted" className="text-center">
        {building ? copy.photoNote : copy.twinNote}
      </Text>
      <AlertDialog
        open={asking}
        title={copy.title}
        message={copy.body}
        actions={[
          {
            label: copy.confirm,
            variant: 'primary',
            onClick: () => {
              setAsking(false);
              remove.mutate({ input: { source: 'web' } });
            },
          },
          { label: copy.keep, variant: 'quiet', onClick: () => setAsking(false) },
        ]}
        onDismiss={() => setAsking(false)}
      />
    </div>
  );
}
