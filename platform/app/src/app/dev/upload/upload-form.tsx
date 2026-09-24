'use client';

import type { ApiClient } from '@robes/api-client';
import { useApiClient } from '@robes/api-client/react';
import { type Asset, UploadContentType } from '@robes/contracts';
import { devUpload as copy } from '@robes/copy';
import { type ChangeEvent, useState } from 'react';
import { Field, SecondaryButton } from '@/components/field';

async function uploadPhoto(api: ApiClient, file: File): Promise<Asset> {
  const contentType = UploadContentType.parse(file.type);
  const { assetId, upload } = await api.call('uploads.create', {
    input: { kind: 'wardrobe', contentType, bytes: file.size },
  });
  // The bytes go straight to storage on the presigned URL, never through the API (SEC-20).
  const put = await fetch(upload.url, {
    method: upload.method,
    headers: upload.headers,
    body: file,
  });
  if (!put.ok) throw new Error('put');
  return api.call('uploads.complete', { params: { id: assetId } });
}

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
      <h1 className="font-display text-4xl font-light text-ink">{copy.title}</h1>
      <Field
        label={copy.fileLabel}
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
        disabled={busy}
        onChange={onFile}
        error={error}
      />
      {busy ? <p className="text-sm text-ink-muted">{copy.uploading}</p> : null}
      {asset?.status === 'pending' ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">{copy.processing}</p>
          <SecondaryButton type="button" onClick={refresh}>
            {copy.refresh}
          </SecondaryButton>
        </div>
      ) : null}
      {asset?.status === 'failed' ? (
        <p role="alert" className="text-sm text-danger">
          {copy.failed}
        </p>
      ) : null}
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
