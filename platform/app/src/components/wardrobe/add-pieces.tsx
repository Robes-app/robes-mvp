'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { ErrorText, Text } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type DragEvent, useId, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { PHOTO_ACCEPT, uploadPhoto } from '@/lib/upload';

// Drop or choose several photos → direct uploads → one batch → pieces appear "reading" (UX-17).
export function AddPieces() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const inputId = useId();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  async function add(files: File[]) {
    const photos = files.filter((f) => PHOTO_ACCEPT.split(',').includes(f.type));
    if (photos.length === 0) return;
    setError(null);
    setProgress({ done: 0, total: photos.length });
    try {
      const assetIds: string[] = [];
      for (const file of photos) {
        assetIds.push((await uploadPhoto(client, file)).id);
        setProgress({ done: assetIds.length, total: photos.length });
      }
      const batch = await client.call('wardrobe.batch', { input: { assetIds } });
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
      // One photo gets its reveal; a batch files quietly and reads on the grid.
      const one = batch.pieces.length === 1 ? batch.pieces[0] : undefined;
      router.push(one ? `/piece/${one.id}?saw=1` : '/wardrobe');
    } catch (err) {
      setError(errorCopy(err));
      setProgress(null);
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    void add([...event.dataTransfer.files]);
  }

  const busy = progress !== null;
  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-crisp border border-dashed px-6 text-center ${
          over ? 'border-ink bg-surface-sunk' : 'border-border-control'
        } focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring`}
      >
        <Icon name="image" size={28} className="text-ink-muted" />
        <span className="font-sans text-base text-ink">{wardrobe.choosePhotos}</span>
        <span className="font-sans text-sm text-ink-muted">{wardrobe.dropHint}</span>
        <input
          id={inputId}
          type="file"
          multiple
          accept={PHOTO_ACCEPT}
          disabled={busy}
          className="sr-only"
          onChange={(e) => {
            void add([...(e.target.files ?? [])]);
            e.target.value = '';
          }}
        />
      </label>
      <Text role="status" size="small" tone="muted" className="min-h-5">
        {progress ? wardrobe.uploading(progress.done, progress.total) : ''}
      </Text>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}
