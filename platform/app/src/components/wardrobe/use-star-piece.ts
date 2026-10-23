'use client';

import { queryKeys, useApiMutation } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { errorCopy } from '@/lib/error-copy';
import { withPatch } from '@/lib/wardrobe';

// The Hero Rack star, shared by the grid and the piece page: it fills at once and the server
// picks the place. One hook, so the two surfaces cannot disagree about a full rack.
export function useStarPiece() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const settle = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.get') });
  };
  const star = useApiMutation('wardrobe.update', {
    onSuccess: (piece) => {
      toast({ message: piece.heroPosition ? wardrobe.card.starred : wardrobe.card.unstarred });
      settle();
    },
    onError: (err) => {
      toast({ message: err.code === 'conflict' ? wardrobe.card.heroFull : errorCopy(err) });
      settle();
    },
  });
  const toggle = (piece: Piece) => {
    const on = piece.heroPosition === null;
    queryClient.setQueriesData(
      { queryKey: queryKeys.route('wardrobe.list') },
      withPatch(piece.id, { heroPosition: on ? 10 : null }),
    );
    star.mutate({ params: { id: piece.id }, input: { hero: on } });
  };
  return { toggle, pending: star.isPending };
}
