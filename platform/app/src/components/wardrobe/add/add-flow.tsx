'use client';

import { wardrobe } from '@robes/copy';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/web';
import { Heading, SegmentedControl } from '@robes/ui';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { type AddDestination, isPhoto, REVIEW_MAX, useShotSession } from '@/lib/add-flow';
import { PHOTO_ACCEPT } from '@/lib/upload';
import { Camera, canUseCamera } from '../camera';
import { Review } from './review';

const copy = wardrobe.add;
const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The Add pieces page (design "Add Piece — Handoff"): the sheet's body, the camera over it, and
// Review in its place once photos are in — one page, so her photos never leave it. Native twin:
// app/wardrobe/add.tsx (the sheet), camera.tsx and review.tsx routes.
export function AddFlow({ initial, start }: { initial: AddDestination; start: 'camera' | null }) {
  const session = useShotSession();
  const [to, setTo] = useState<AddDestination>(initial);
  const [stage, setStage] = useState<'panel' | 'camera' | 'review'>('panel');
  const [from, setFrom] = useState<'camera' | 'roll' | null>(null);
  const device = useRef<HTMLInputElement>(null);

  // The OS camera answers when the browser has none (or she refused it); its photo goes to
  // Review like any shot.
  function openCamera() {
    setFrom('camera');
    if (canUseCamera()) setStage('camera');
    else device.current?.click();
  }

  const started = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on arrival from Create.
  useEffect(() => {
    if (start === 'camera' && !started.current) {
      started.current = true;
      if (canUseCamera()) {
        setFrom('camera');
        setStage('camera');
      }
    }
  }, []);

  function addFiles(files: File[], via: 'camera' | 'roll') {
    const photos = files.filter(isPhoto).slice(0, REVIEW_MAX);
    if (!photos.length) return;
    setFrom(via);
    for (const file of photos) void session.add(file);
    setStage('review');
  }

  function again() {
    session.reset();
    setStage('panel');
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
          addFiles(files, 'camera');
        }}
      />
      {stage === 'review' ? (
        <Review
          to={to}
          session={session}
          onAnother={again}
          {...(from === 'camera'
            ? {
                onRetake: () => {
                  session.reset();
                  openCamera();
                },
              }
            : {})}
        />
      ) : (
        <AddPiecesPanel
          to={to}
          onTo={setTo}
          onCamera={openCamera}
          onRoll={(files) => addFiles(files, 'roll')}
        />
      )}
      {stage === 'camera' ? (
        <Camera
          to={to}
          onTo={setTo}
          session={session}
          onReview={() => setStage('review')}
          onClose={() => setStage('panel')}
          onUseDevice={() => {
            setStage('panel');
            device.current?.click();
          }}
        />
      ) : null}
    </>
  );
}

// The Add pieces sheet's body (design 3a): where the pieces go, chosen once and carried through
// every path; the camera and the camera roll as the two large targets; a link, a receipt and the
// piece by hand as rows. Native twin: features/wardrobe/add/AddPiecesPanel.tsx.
export function AddPiecesPanel({
  to,
  onTo,
  onCamera,
  onRoll,
}: {
  to: AddDestination;
  onTo: (to: AddDestination) => void;
  onCamera: () => void;
  onRoll: (files: File[]) => void;
}) {
  const rollId = useId();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <Heading level={1} size="lg">
        {copy.title}
      </Heading>
      <SegmentedControl<AddDestination>
        label={copy.destination}
        value={to}
        onChange={onTo}
        options={[
          { value: 'wardrobe', label: copy.to.wardrobe },
          { value: 'wishlist', label: copy.to.wishlist },
        ]}
        className="w-full"
      />
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onCamera} className={tile}>
          <Icon name="camera" size={28} className="text-ink" />
          <span className="font-sans text-base text-ink">{copy.doors.photograph}</span>
        </button>
        <label htmlFor={rollId} className={`${tile} cursor-pointer focus-within:outline-2`}>
          <Icon name="image" size={28} className="text-ink" />
          <span className="font-sans text-base text-ink">{copy.doors.cameraRoll}</span>
          <input
            id={rollId}
            type="file"
            multiple
            accept={PHOTO_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = '';
              onRoll(files);
            }}
          />
        </label>
      </div>
      <nav aria-label={copy.title} className="flex flex-col">
        <Door icon="link" label={copy.doors.link} href={`/wardrobe/link?to=${to}`} />
        <Door icon="mail" label={copy.doors.receipt} href="/wardrobe/receipt" />
        <Door icon="pencil" label={copy.doors.manual} href={`/wardrobe/manual?to=${to}`} />
      </nav>
    </div>
  );
}

const tile = `flex flex-col items-center justify-center gap-3 rounded-soft border border-hairline bg-surface py-7 hover:border-ink focus-within:outline-focus-ring focus-within:outline-offset-2 ${focusRing}`;

function Door({ icon, label, href }: { icon: IconName; label: string; href: string }) {
  return (
    <Link
      href={href}
      className={`flex min-h-11 items-center gap-4 border-hairline border-b py-4 hover:text-ink ${focusRing}`}
    >
      <Icon name={icon} size={22} className="text-ink" />
      <span className="flex-1 font-sans text-base text-ink">{label}</span>
      <Icon name="forward" size={15} className="text-ink-faint" />
    </Link>
  );
}
