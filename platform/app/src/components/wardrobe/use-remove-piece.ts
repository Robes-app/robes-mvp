'use client';

import { queryKeys, useApiClient, useUndoableMutation } from '@robes/api-client/react';
import { wardrobe } from '@robes/copy';
import { useToast } from '@robes/ui';
import { errorCopy } from '@/lib/error-copy';
import { withoutId } from '@/lib/wardrobe';

// Soft delete that disappears at once and offers Undo for ≥6 s (UX-13/UX-15).
export function useRemovePiece() {
  const client = useApiClient();
  const toast = useToast();
  return useUndoableMutation('wardrobe.delete', {
    optimistic: (args) => [
      { queryKey: queryKeys.route('wardrobe.list'), update: withoutId(args.params.id) },
    ],
    onError: (err) => toast({ message: errorCopy(err) }),
    undo: {
      onAvailable: (handle) =>
        toast({
          message: wardrobe.deleted,
          action: { label: wardrobe.undo, onAction: () => void handle.undo() },
        }),
      compensate: (args) => client.call('wardrobe.restore', { params: { id: args.params.id } }),
    },
  });
}
