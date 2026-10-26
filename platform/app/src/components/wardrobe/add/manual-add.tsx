'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { PieceValues, UpdatePieceInput } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { type RowChanges, readDraft, rowChanges, wishChanges } from '@robes/core/add-flow';
import { Icon } from '@robes/icons/web';
import { Button, ErrorText, Eyebrow, Heading, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import type { AddDestination } from '@/lib/add-flow';
import { PHOTO_ACCEPT, uploadPhoto } from '@/lib/upload';
import { invalidateWardrobe } from '@/lib/wardrobe';
import { type PieceField, PieceFieldSheet } from '../piece-field-sheet';
import { RecordRows } from '../piece-rows';
import { Filed } from './review';

const copy = wardrobe.add.manual;
const EMPTY = readDraft({
  label: '',
  brand: null,
  notes: null,
  categoryL2: null,
  categoryL3: null,
  color: null,
});

// Add without a photo (design "Add Piece — Handoff"): a dashed "Add a photo" invite, then the
// record's four sections as rows, each opening its drawer, and the one commit. Native twin:
// features/wardrobe/add/ManualAdd.tsx.
export function ManualAdd({ to }: { to: AddDestination }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const inputId = useId();
  const [changes, setChanges] = useState<RowChanges>({});
  const [field, setField] = useState<PieceField | null>(null);
  const [photo, setPhoto] = useState<{ url: string; assetId: string | null } | null>(null);
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const values = { ...EMPTY, ...changes } as PieceValues;

  // The photo's object URL lives as long as it is shown.
  const shown = useRef<string | null>(null);
  useEffect(() => () => void (shown.current && URL.revokeObjectURL(shown.current)), []);

  async function addPhoto(file: File | undefined) {
    if (!file) return;
    if (shown.current) URL.revokeObjectURL(shown.current);
    shown.current = URL.createObjectURL(file);
    setPhoto({ url: shown.current, assetId: null });
    try {
      const asset = await uploadPhoto(api, file, to === 'wishlist' ? 'wishlist' : 'wardrobe');
      setPhoto((p) => (p ? { ...p, assetId: asset.id } : p));
    } catch {
      setPhoto(null);
      toast({ message: wardrobe.addFailed });
    }
  }

  async function file() {
    const label = values.label.trim();
    if (!label) {
      setNameError(true);
      setField('label');
      return;
    }
    setSaving(true);
    setFailed(false);
    const image = photo?.assetId ? { imageAssetId: photo.assetId } : {};
    try {
      if (to === 'wishlist') {
        await api.call('wishlist.create', { input: { ...wishChanges(changes), label, ...image } });
        await queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') });
      } else {
        await api.call('wardrobe.create', { input: { ...changes, label, ...image } });
        await invalidateWardrobe(queryClient);
      }
      setDone(true);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  if (done) return <Filed to={to} kept={1} />;

  const uploading = !!photo && !photo.assetId;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Heading level={1} size="lg">
          {copy.title} <em>{copy.wink}</em>
        </Heading>
      </header>
      <label
        htmlFor={inputId}
        aria-busy={uploading}
        className="relative flex h-40 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-soft border border-border-control border-dashed text-ink-muted focus-within:outline-2 focus-within:outline-focus-ring focus-within:outline-offset-2"
      >
        {photo ? (
          // biome-ignore lint/performance/noImgElement: a local object URL of her own photo
          <img src={photo.url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <Icon name="camera" size={24} />
        )}
        <span className={photo ? 'sr-only' : 'font-sans text-base'}>
          {photo ? copy.changePhoto : copy.addPhoto}
        </span>
        {uploading ? (
          <span role="status" className="absolute inset-x-0 bottom-0 bg-bg/80 px-3 py-2 text-sm">
            {copy.uploading}
          </span>
        ) : null}
        <input
          id={inputId}
          type="file"
          accept={PHOTO_ACCEPT}
          disabled={uploading}
          className="sr-only"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            event.target.value = '';
            void addPhoto(picked);
          }}
        />
      </label>
      <RecordRows values={values} onField={setField} withName />
      {nameError && !values.label.trim() ? <ErrorText>{copy.nameFirst}</ErrorText> : null}
      {failed ? <ErrorText>{copy.failed}</ErrorText> : null}
      <Button variant="primary" loading={saving} disabled={uploading} onClick={() => void file()}>
        {wardrobe.add.file(to)}
      </Button>
      <PieceFieldSheet
        piece={values}
        field={field}
        onClose={() => setField(null)}
        onSave={(input: UpdatePieceInput) => setChanges((c) => ({ ...c, ...rowChanges(input) }))}
        saving={false}
      />
    </div>
  );
}
