'use client';

import { useApiClient } from '@robes/api-client/react';
import type { Asset } from '@robes/contracts';
import { devUpload as copy } from '@robes/copy';
import { Button, ErrorText, Field, Heading, Text } from '@robes/ui';
import { type ChangeEvent, useState } from 'react';
import { uploadPhoto } from '@/lib/upload';

export function UploadForm() {
  const api = useApiClient();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setAsset(null);
    try {
      setAsset(await uploadPhoto(api, file));
    } catch {
      setError(copy.uploadFailed);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!asset) return;
    const next = await api.call('assets.get', { params: { id: asset.id } }).catch(() => null);
    if (next) setAsset(next);
  }

  const largest = asset?.renditions.at(-1);
  return (
    <div className="flex flex-col gap-8">
      <Heading level={1}>{copy.title}</Heading>
      <Field
        label={copy.fileLabel}
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
        disabled={busy}
        onChange={onFile}
        error={error}
      />
      {busy ? (
        <Text size="small" tone="muted">
          {copy.uploading}
        </Text>
      ) : null}
      {asset?.status === 'pending' ? (
        <div className="flex items-center justify-between gap-4">
          <Text size="small" tone="muted">
            {copy.processing}
          </Text>
          <Button onClick={refresh}>{copy.refresh}</Button>
        </div>
      ) : null}
      {asset?.status === 'failed' ? <ErrorText>{copy.failed}</ErrorText> : null}
      {asset?.status === 'ready' && largest ? (
        <figure className="flex flex-col gap-2">
          <picture>
            <source type="image/avif" srcSet={largest.avif} />
            <img
              src={largest.webp}
              alt={copy.imageAlt}
              width={asset.width ?? undefined}
              height={asset.height ?? undefined}
              className="h-auto w-full rounded-crisp"
            />
          </picture>
          <figcaption className="text-sm text-ink-muted">{copy.ready}</figcaption>
        </figure>
      ) : null}
    </div>
  );
}
