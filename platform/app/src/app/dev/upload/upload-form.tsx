'use client';

import type { Asset, CreateUploadOutput } from '@robes/contracts';
import { devUpload as copy } from '@robes/copy';
import { type ChangeEvent, useState } from 'react';
import { Field, SecondaryButton } from '@/components/field';

const JSON_HEADERS = { 'content-type': 'application/json' };

async function uploadPhoto(file: File): Promise<Asset> {
  const created = await fetch('/api/v1/uploads', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ kind: 'wardrobe', contentType: file.type, bytes: file.size }),
  });
  if (!created.ok) throw new Error('create');
  const { assetId, upload } = (await created.json()) as CreateUploadOutput;
  const put = await fetch(upload.url, {
    method: upload.method,
    headers: upload.headers,
    body: file,
  });
  if (!put.ok) throw new Error('put');
  const completed = await fetch(`/api/v1/uploads/${assetId}/complete`, { method: 'POST' });
  if (!completed.ok) throw new Error('complete');
  return (await completed.json()) as Asset;
}

export function UploadForm() {
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
      setAsset(await uploadPhoto(file));
    } catch {
      setError(copy.uploadFailed);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!asset) return;
    const res = await fetch(`/api/v1/assets/${asset.id}`);
    if (res.ok) setAsset((await res.json()) as Asset);
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
