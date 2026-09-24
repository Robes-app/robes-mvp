'use client';

import { useApiMutation } from '@robes/api-client/react';
import type { Share } from '@robes/contracts';
import { share as copy } from '@robes/copy';
import { Button, useToast } from '@robes/ui';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

// Creates (or returns the existing) public link and copies it; "Stop sharing" turns it off.
export function ShareLook({ lookId }: { lookId: string }) {
  const toast = useToast();
  const [link, setLink] = useState<Share | null>(null);
  const create = useApiMutation('shares.create', {
    onSuccess: async (shared) => {
      setLink(shared);
      try {
        await navigator.clipboard.writeText(shared.url);
        toast({ message: copy.copied });
      } catch {
        toast({ message: copy.copyFailed(shared.url) });
      }
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const revoke = useApiMutation('shares.revoke', {
    onSuccess: () => {
      setLink(null);
      toast({ message: copy.stopped });
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        loading={create.isPending}
        onClick={() => create.mutate({ input: { subjectType: 'look', subjectId: lookId } })}
      >
        {copy.action}
      </Button>
      {link ? (
        <Button
          variant="quiet"
          loading={revoke.isPending}
          onClick={() => revoke.mutate({ params: { token: link.token } })}
        >
          {copy.stop}
        </Button>
      ) : null}
    </div>
  );
}
