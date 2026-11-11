'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import { lookbook } from '@robes/copy';
import { AlertDialog } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { isDraftsFull } from '@/lib/look-states';
import { uploadPhoto } from '@/lib/upload';
import { CaptureCamera } from './capture-camera';

const copy = lookbook.draftLook.capture.camera;

// Capture a look (Capture PRD 1c, canvas 1c): the camera over the screen that opened it; Use
// photo uploads the photograph, makes the draft look that carries it, and opens that draft's
// drawer — for `day` when Home's day opened the camera. Nothing is kept until then: closing the
// camera leaves no trace. Native twin: mobile/src/features/capture/LookCapture.tsx.
export function LookCapture({
  open,
  day,
  onClose,
}: {
  open: boolean;
  day?: string;
  onClose: () => void;
}) {
  const api = useApiClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { track } = useAnalytics().analytics;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Five drafts wait: she lets the oldest go, or keeps them and the photograph is dropped.
  const [full, setFull] = useState<{ assetId: string; oldest: string } | null>(null);

  const make = async (assetId: string, letGoOldest = false) => {
    const look = await api.call('looks.create', {
      input: {
        status: 'draft',
        pieces: [],
        photoAssetId: assetId,
        ...(letGoOldest ? { letGoOldest } : {}),
      },
    });
    track('look_captured', { day: day !== undefined });
    queryClient.setQueryData(queryKeys.call('looks.get', { params: { id: look.id } }), look);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    onClose();
    router.push(`/looks/draft/${look.id}${day ? `?day=${day}` : ''}`);
  };

  const use = async (file: File) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    let assetId: string | null = null;
    try {
      assetId = (await uploadPhoto(api, file, 'look_photo')).id;
      await make(assetId);
    } catch (err) {
      if (assetId && isDraftsFull(err)) {
        const drafts = await api
          .call('looks.list', { input: { limit: 60, status: 'draft' } })
          .catch(() => null);
        setFull({ assetId, oldest: drafts?.items.at(-1)?.name ?? lookbook.draftTile.untitled });
      } else setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  return (
    <>
      <CaptureCamera
        copy={copy}
        onUse={(file) => void use(file)}
        onClose={onClose}
        busy={busy}
        error={error}
      />
      <AlertDialog
        open={full !== null}
        title={lookbook.drafts.fullTitle}
        message={lookbook.drafts.fullBody(full?.oldest ?? lookbook.draftTile.untitled)}
        actions={[
          {
            label: lookbook.drafts.letGo,
            variant: 'primary',
            onClick: () => {
              const assetId = full?.assetId;
              setFull(null);
              if (!assetId) return;
              setBusy(true);
              void make(assetId, true)
                .catch(() => setError(copy.failed))
                .finally(() => setBusy(false));
            },
          },
          {
            label: lookbook.drafts.keep,
            variant: 'outline',
            onClick: () => {
              // The photograph she is not keeping goes with the draft that never was.
              if (full)
                void api.call('uploads.discard', { params: { id: full.assetId } }).catch(() => {});
              setFull(null);
            },
          },
        ]}
        onDismiss={() => setFull(null)}
      />
    </>
  );
}
