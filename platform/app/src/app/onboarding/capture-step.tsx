'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import { firstRun as copy, wardrobe } from '@robes/copy';
import { Button, ErrorText } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { type CameraShot, ShotCamera, type ShotCameraCopy } from '@/components/capture/shot-camera';
import { REVIEW_MAX } from '@/lib/add-flow';
import { useUploadSitting } from '@/lib/use-upload-sitting';
import { Frame, QuietLink } from './frame';

export type CaptureMode = 'looks' | 'pieces';

const cameraCopy = (mode: CaptureMode): ShotCameraCopy => {
  const c = copy[mode];
  return {
    title: mode === 'looks' ? copy.looks.title : wardrobe.camera.title,
    close: wardrobe.camera.close,
    shutter: wardrobe.capture.camera.shutter,
    photos: wardrobe.capture.camera.photos,
    hint: c.hint,
    next: c.next,
    full: c.full,
    denied: wardrobe.capture.camera.denied,
    useDevice: wardrobe.camera.useDevice,
    ready: c.ready,
    done: copy.save,
    taken: wardrobe.camera.taken,
    remove: copy.removePhoto,
  };
};

// The design's photographs (canvas "Robes onboarding — prototype", Q3 and Q4), in public/onboarding.
const LOOK_PHOTOS = ['look-1', 'look-2', 'look-3'] as const;
// In the order of copy.pieces.examples: Jacket, Knit, Jeans, Dress, Boots, Bag.
const PIECE_PHOTOS = [
  'piece-jacket',
  'piece-knit',
  'piece-jeans',
  'piece-dress',
  'piece-boots',
  'piece-bag',
] as const;
const FAN = [
  'translate(calc(-50% - 100px), calc(-50% + 16px)) rotate(-6deg)',
  'translate(calc(-50% + 100px), calc(-50% + 16px)) rotate(6deg)',
  'translate(-50%, -50%)',
] as const;

// 05 Saved looks and 06 Pieces you love (onboarding PRD R-5, R-6; design Q3, Q4): the intro, then
// the shared ShotCamera — each photograph uploading as she takes it, a click on its thumbnail
// taking it off — then Save N files them and the step says where they went, with Continue and Add
// more. A look: each photo its own saved look, its picture the photo, no piece filed. A piece: one
// per photo, read in the background, starred. Native twin: features/onboarding/CaptureStep.tsx.
export function CaptureStep({
  mode,
  step,
  onBack,
  onDone,
  onSkip,
}: {
  mode: CaptureMode;
  step: number;
  onBack: () => void;
  onDone: (n: number) => void;
  onSkip: () => void;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { track } = useAnalytics().analytics;
  const sitting = useUploadSitting(mode === 'looks' ? 'look_photo' : 'wardrobe');
  const [view, setView] = useState<'intro' | 'camera' | 'saved'>('intro');
  const [saved, setSaved] = useState<CameraShot[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = copy[mode];

  // Save N: nothing is a look or a piece before this click. A failure keeps nothing.
  async function save() {
    if (saving || !sitting.ready) return;
    setSaving(true);
    setError(null);
    const assetIds = sitting.kept.flatMap((s) => (s.assetId ? [s.assetId] : []));
    try {
      if (mode === 'looks') {
        for (const photoAssetId of assetIds)
          await api.call('looks.create', { input: { status: 'saved', pieces: [], photoAssetId } });
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
      } else {
        const { pieces } = await api.call('wardrobe.batch', { input: { assetIds } });
        // Each starred in turn: the Hero Rack holds ten, so a piece past it files unstarred,
        // with nothing said (PRD risks).
        for (const piece of pieces) {
          await api
            .call('wardrobe.update', { params: { id: piece.id }, input: { hero: true } })
            .catch(() => {});
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
      }
      setSaved((all) => [...all, ...sitting.kept.map(({ key, url }) => ({ key, url }))]);
      sitting.reset();
      setView('saved');
    } catch {
      setError(c.failed);
      setView('intro');
    } finally {
      setSaving(false);
    }
  }

  if (view === 'camera') {
    return (
      <ShotCamera
        copy={cameraCopy(mode)}
        shots={sitting.shots}
        max={REVIEW_MAX}
        canDone={sitting.ready && !saving}
        onAdd={sitting.add}
        onRemove={sitting.remove}
        onDone={() => void save()}
        onClose={() => {
          for (const s of sitting.shots) sitting.remove(s.key);
          setView(saved.length ? 'saved' : 'intro');
        }}
        rollFirst={mode === 'looks' && sitting.shots.length === 0 && saved.length === 0}
        testId="onboarding-camera"
      />
    );
  }

  if (view === 'saved') {
    return (
      <Frame
        step={step}
        title={c.saved}
        titleEm={c.savedEm(saved.length)}
        footer={
          <>
            <Button
              variant="primary"
              onClick={() => {
                track('onboarding_captured', { step: mode, n: saved.length });
                onDone(saved.length);
              }}
            >
              {copy.continue}
            </Button>
            <QuietLink label={copy.addMore} onClick={() => setView('camera')} />
          </>
        }
      >
        <ul className="grid grid-cols-3 gap-2.5" data-testid="onboarding-saved">
          {saved.map((s) => (
            <li
              key={s.key}
              className="aspect-[3/4] overflow-hidden rounded-thumb bg-surface-raised"
            >
              {/* biome-ignore lint/performance/noImgElement: a local object URL of her own photo */}
              <img src={s.url} alt="" className="block size-full object-cover" />
            </li>
          ))}
        </ul>
      </Frame>
    );
  }

  return (
    <Frame
      step={step}
      title={c.title}
      titleEm={c.titleEm}
      onBack={onBack}
      footer={
        <>
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button variant="primary" loading={saving} onClick={() => setView('camera')}>
            {mode === 'looks' ? copy.looks.choose : copy.pieces.add}
          </Button>
          <QuietLink label={copy.skip} onClick={onSkip} />
        </>
      }
    >
      {mode === 'looks' ? (
        <div className="flex flex-col gap-6">
          <p className="-mt-3.5 font-display text-[19px] text-ink-muted italic leading-[1.35]">
            {copy.looks.sub}
          </p>
          <div aria-hidden className="relative h-[220px]">
            {LOOK_PHOTOS.map((name, i) => (
              // biome-ignore lint/performance/noImgElement: a fixed design photograph
              <img
                key={name}
                src={`/onboarding/${name}.jpg`}
                alt=""
                style={{ transform: FAN[i] }}
                className={`absolute top-1/2 left-1/2 h-[187px] w-[140px] rounded-thumb border-4 border-surface-raised bg-surface-sunk object-cover shadow-[0_10px_24px_-10px_rgb(32_32_33/0.4)] ${i === 2 ? 'z-2' : 'z-1'}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <ul aria-hidden className="grid grid-cols-3 gap-x-2.5 gap-y-3.5">
          {copy.pieces.examples.map((label, i) => (
            <li key={label} className="flex flex-col gap-1.5">
              {/* biome-ignore lint/performance/noImgElement: a fixed design photograph */}
              <img
                src={`/onboarding/${PIECE_PHOTOS[i]}.jpg`}
                alt=""
                className="aspect-[4/5] w-full rounded-thumb bg-surface-raised object-cover"
              />
              <span className="font-medium font-sans text-[9px] text-accent-warm uppercase tracking-[0.18em]">
                {label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}
