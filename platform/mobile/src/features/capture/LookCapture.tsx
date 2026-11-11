import { useApiClient } from '@robes/api-client/react';
import { lookbook } from '@robes/copy';
import { AlertDialog } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { isDraftsFull, useInvalidateLooks } from '@/features/looks/look-states';
import { type PickedPhoto, uploadPhoto } from '@/features/wardrobe/add-pieces';
import { nativeAnalytics } from '@/lib/analytics';
import { CaptureCamera } from './CaptureCamera';

const copy = lookbook.draftLook.capture.camera;

// Capture a look (Capture PRD 1c, canvas 1c): the camera full screen; Use photo uploads the
// photograph, makes the draft look that carries it, and opens that draft's sheet in the camera's
// place — for `day` when Home's day opened it. Nothing is kept until then: closing the camera
// leaves no trace. Web twin: app/src/components/capture/look-capture.tsx.
export function LookCapture({ day }: { day: string | null }) {
  const api = useApiClient();
  const router = useRouter();
  const refresh = useInvalidateLooks();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Five drafts wait: she lets the oldest go, or keeps them and the photograph is dropped.
  const [full, setFull] = useState<{ assetId: string; oldest: string } | null>(null);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const make = async (assetId: string, letGoOldest = false) => {
    const look = await api.call('looks.create', {
      input: {
        status: 'draft',
        pieces: [],
        photoAssetId: assetId,
        ...(letGoOldest ? { letGoOldest } : {}),
      },
    });
    nativeAnalytics.track('look_captured', { day: day !== null });
    refresh(look);
    // The draft takes the camera's place, so its × lands on the screen that opened the camera.
    router.replace(`/looks/draft/${look.id}${day ? `?day=${day}` : ''}`);
  };

  const use = async (photo: PickedPhoto) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    let assetId: string | null = null;
    try {
      assetId = await uploadPhoto(api, photo, 'look_photo');
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

  return (
    <>
      <CaptureCamera
        copy={copy}
        onUse={(photo) => void use(photo)}
        onClose={close}
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
            onPress: () => {
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
            onPress: () => {
              // The photograph she is not keeping goes with the draft that never was.
              if (full) {
                void api.call('uploads.discard', { params: { id: full.assetId } }).catch(() => {});
              }
              setFull(null);
            },
          },
        ]}
        onDismiss={() => setFull(null)}
      />
    </>
  );
}
