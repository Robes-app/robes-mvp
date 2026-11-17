'use client';

import { wardrobe } from '@robes/copy';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useHideBack } from '@/components/shell/app-shell';
import {
  type AddDestination,
  isPhoto,
  REVIEW_MAX,
  type SessionShot,
  useShotSession,
  wardrobeHref,
} from '@/lib/add-flow';
import { PHOTO_ACCEPT } from '@/lib/upload';
import { Camera, canUseCamera } from '../camera';
import { ManualAdd } from './manual-add';
import { Review } from './review';

const copy = wardrobe.add;

// The wardrobe camera (Capture PRD 3c) and Review in its place once photos are in — one page, so
// her photos never leave it, and the camera and Review pass the same sitting back and forth. Where
// they file was chosen on the Add pieces sheet (`to`); the page with its own Wardrobe/Wishlist
// switch is retired (audit P2, 16 Nov). With no camera, or one refused, the camera offers the
// phone's own. Native twin: app/wardrobe/camera.tsx and review.tsx routes.
export function AddFlow({ to }: { to: AddDestination }) {
  const router = useRouter();
  const session = useShotSession();
  const [stage, setStage] = useState<'camera' | 'review' | 'manual'>('camera');
  // A read that never landed, filled in by hand with its photo.
  const [byHand, setByHand] = useState<SessionShot | null>(null);
  const device = useRef<HTMLInputElement>(null);
  // Review has its own × beside its title; the top bar's back pill would be a second way out.
  useHideBack(stage === 'review');

  function addFiles(files: File[]) {
    const photos = files.filter(isPhoto).slice(0, REVIEW_MAX);
    if (!photos.length) return;
    for (const file of photos) void session.add(file);
    setStage('review');
  }

  // Another sitting: the camera again, empty.
  function again() {
    session.reset();
    setStage('camera');
  }

  return (
    <>
      <input
        ref={device}
        type="file"
        accept={PHOTO_ACCEPT}
        capture="environment"
        aria-label={copy.doors.photograph}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = '';
          addFiles(files);
        }}
      />
      {stage === 'manual' ? (
        <ManualAdd to={to} {...(byHand?.file ? { photo: byHand.file } : {})} />
      ) : stage === 'review' ? (
        <Review
          onFillIn={(shot) => {
            setByHand(shot ?? null);
            setStage('manual');
          }}
          to={to}
          session={session}
          onAnother={again}
          // The camera stays behind Review with its photographs kept (Capture PRD 3c.3).
          {...(canUseCamera() ? { onCamera: () => setStage('camera') } : {})}
        />
      ) : null}
      {stage === 'camera' ? (
        <Camera
          session={session}
          onReview={() => setStage('review')}
          // Back to the list she came from: the sheet she chose this in has done its work.
          onClose={() => router.push(wardrobeHref(to))}
          // The phone's own camera, when the browser has none or she refused it.
          onUseDevice={() => device.current?.click()}
        />
      ) : null}
    </>
  );
}
