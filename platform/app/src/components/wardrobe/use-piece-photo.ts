'use client';

import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import { useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { uploadPhoto } from '@/lib/upload';
import { invalidateWardrobe } from '@/lib/wardrobe';

// Change photo (legacy __rbPiecePhotoPick): the same upload door as the look's photograph, then
// `wardrobe.photo` puts it on the piece. Native twin: mobile/src/features/wardrobe/pieces.ts.
export function usePiecePhoto(id: string) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const attach = useApiMutation('wardrobe.photo', {
    onSuccess: (piece) => {
      queryClient.setQueryData(queryKeys.call('wardrobe.get', { params: { id } }), piece);
      void invalidateWardrobe(queryClient);
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const change = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadPhoto(api, file, 'wardrobe');
      attach.mutate({ params: { id }, input: { assetId: asset.id } });
    } catch (err) {
      toast({ message: errorCopy(err) });
    } finally {
      setUploading(false);
    }
  };
  return { change, busy: uploading || attach.isPending };
}
