'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { PieceValues, UpdatePieceInput } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { type RowChanges, readDraft, rowChanges, wishChanges } from '@robes/core/add-flow';
import { shade } from '@robes/core/colour';
import { suggestPieceName } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/web';
import { Button, ErrorText, Eyebrow, Heading, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { PinnedAction } from '@/components/pinned-action';
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

// Add without a photo (design "Add Piece — Handoff", redlines 06/07): the record's sections as
// rows, each opening its drawer, a dashed "Add a photo later" row at the end, and the one commit
// — which waits for a category, and names the piece from it when she leaves the name blank. A
// read that never landed arrives here with its photo. Native twin:
// features/wardrobe/add/ManualAdd.tsx.
export function ManualAdd({ to, photo: initial }: { to: AddDestination; photo?: File }) {
  const api = useApiClient();
  const { track } = useAnalytics().analytics;
  const queryClient = useQueryClient();
  const toast = useToast();
  const inputId = useId();
  const [changes, setChanges] = useState<RowChanges>({});
  const [field, setField] = useState<PieceField | null>(null);
  const [photo, setPhoto] = useState<{ url: string; assetId: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const values = { ...EMPTY, ...changes } as PieceValues;

  // The photo's object URL lives as long as it is shown.
  const shown = useRef<string | null>(null);
  useEffect(() => () => void (shown.current && URL.revokeObjectURL(shown.current)), []);
  const attached = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the photo she arrived with, once.
  useEffect(() => {
    if (initial && !attached.current) {
      attached.current = true;
      void addPhoto(initial);
    }
  }, []);

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
    const label = values.label.trim() || suggested;
    if (!label) return;
    setSaving(true);
    setFailed(false);
    const image = photo?.assetId ? { imageAssetId: photo.assetId } : {};
    try {
      if (to === 'wishlist') {
        await api.call('wishlist.create', { input: { ...wishChanges(changes), label, ...image } });
        await queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') });
      } else {
        await api.call('wardrobe.create', { input: { ...changes, label, ...image } });
        track('wardrobe_added', { source: 'hand', batch_n: 1, batch_i: 1 });
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
  const suggested =
    suggestPieceName({ ...values, colourName: shade(values.colourShade)?.name ?? null }) ?? '';
  const ready = !!values.categoryL2 && !uploading;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Heading level={1} size="lg">
          {copy.title} <em>{copy.wink}</em>
        </Heading>
      </header>
      <RecordRows
        values={values}
        onField={setField}
        withName
        onName={(label) => setChanges((c) => ({ ...c, label }))}
      />
      <label
        htmlFor={inputId}
        aria-busy={uploading}
        className="relative flex min-h-16 cursor-pointer items-center gap-4 overflow-hidden rounded-soft border border-border-control border-dashed px-4 text-ink-muted focus-within:outline-2 focus-within:outline-focus-ring focus-within:outline-offset-2"
      >
        {photo ? (
          // biome-ignore lint/performance/noImgElement: a local object URL of her own photo
          <img src={photo.url} alt="" className="size-12 rounded-crisp object-cover" />
        ) : (
          <Icon name="camera" size={20} />
        )}
        <span className="font-sans text-base">
          {uploading ? copy.uploading : photo ? copy.changePhoto : copy.addPhoto}
        </span>
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
      {failed ? <ErrorText>{copy.failed}</ErrorText> : null}
      <PinnedAction>
        <Button
          variant="primary"
          block
          loading={saving}
          disabled={!ready}
          onClick={() => void file()}
        >
          {wardrobe.add.file(to)}
        </Button>
      </PinnedAction>
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
