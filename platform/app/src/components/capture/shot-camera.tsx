'use client';

import { Icon } from '@robes/icons/web';
import { useEffect, useRef, useState } from 'react';
import { CAMERA_CONSTRAINTS } from '@/components/wardrobe/camera-capture';
import { isPhoto } from '@/lib/add-flow';
import { PHOTO_ACCEPT } from '@/lib/upload';
import {
  Brackets,
  CamDisc,
  CamPill,
  DARK_FOCUS,
  Flash,
  Shutter,
  useCameraStream,
} from './camera-parts';

// The flash a shot plays (Capture PRD 3c.2: 380 ms).
const FLASH_MS = 380;

export interface ShotCameraCopy {
  title: string;
  close: string;
  shutter: string;
  photos: string;
  hint: string;
  next: string;
  full: string;
  denied: string;
  useDevice: string;
  ready: (n: number) => string;
  done: (n: number) => string;
  taken: (n: number) => string;
  // Set when a click on a thumbnail takes that photograph off the strip (onboarding R-5.2).
  remove?: string;
}

export interface CameraShot {
  key: string;
  url: string;
}

// The camera for several photographs (Capture PRD 3c.2; canvas frame 3c), shared by Wardrobe ›
// Photo and Getting to know you's Saved looks and Pieces you love: the viewfinder stays open
// between shots. Each shot flashes and joins the strip above the controls with a sage tick; from
// the first one the counter says how many are ready, the hint moves on, and the ink pill (`done`)
// hands the sitting on. Her photos (several at once) join it too; without a camera they are the
// way in. What a shot becomes is the caller's. Native twin:
// mobile/src/features/capture/ShotCamera.tsx.
export function ShotCamera({
  copy,
  shots,
  max,
  canDone,
  onAdd,
  onRemove,
  onDone,
  onClose,
  onUseDevice,
  rollFirst = false,
  testId = 'piece-camera',
}: {
  copy: ShotCameraCopy;
  shots: readonly CameraShot[];
  max: number;
  canDone: boolean;
  onAdd: (file: File) => void;
  onRemove?: (key: string) => void;
  onDone: () => void;
  onClose: () => void;
  // The phone's own camera, when this one is refused; without it her photos are the way in.
  onUseDevice?: () => void;
  // Opens her photos at once (Saved looks' "Choose saved looks"), the camera behind them.
  rollFirst?: boolean;
  testId?: string;
}) {
  const library = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState(false);
  const { video, live, refused, shoot, stop } = useCameraStream(CAMERA_CONSTRAINTS, true);
  const full = shots.length >= max;

  // The stream stops as the camera goes; a close the caller asks about first keeps it running.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rolled = useRef(false);
  useEffect(() => {
    if (!rollFirst || rolled.current) return;
    rolled.current = true;
    library.current?.click();
  }, [rollFirst]);

  function take() {
    if (full) return;
    setFlash(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setFlash(false)));
    void shoot().then((file) => {
      if (file) onAdd(file);
    });
  }

  function done() {
    if (!canDone) return;
    stop();
    onDone();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      className="fixed inset-0 z-45 overflow-hidden bg-ink900 text-cream50 motion-safe:animate-fade-in"
      data-testid={testId}
    >
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        aria-hidden
        className="absolute inset-0 size-full object-cover"
      />
      <Flash on={flash} ms={FLASH_MS} />
      <div className="relative mx-auto h-full w-full max-w-[520px]">
        <Brackets className="inset-x-[46px] top-[112px] bottom-[294px]" />
        <CamDisc
          icon="close"
          label={copy.close}
          onClick={onClose}
          className="absolute top-[calc(env(safe-area-inset-top)+12px)] left-3"
          testId="piece-camera-close"
        />
        {shots.length ? (
          <p
            role="status"
            className="absolute top-[calc(env(safe-area-inset-top)+22px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill bg-cream50/95 px-4 py-2 font-medium font-sans text-[10px] text-ink900 uppercase tracking-[0.2em]"
          >
            {copy.ready(shots.length)}
          </p>
        ) : null}
        {!live && refused ? (
          <div className="absolute inset-x-8 top-1/3 flex flex-col items-center gap-4">
            <CamPill role="alert">{copy.denied}</CamPill>
            {onUseDevice ? (
              <button
                type="button"
                onClick={onUseDevice}
                className={`inline-flex min-h-11 items-center rounded-pill border border-cream50/40 px-5 font-medium font-sans text-[10px] uppercase tracking-[0.2em] ${DARK_FOCUS}`}
              >
                {copy.useDevice}
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+36px)] flex flex-col items-stretch gap-4">
          <CamPill>{full ? copy.full : shots.length ? copy.next : copy.hint}</CamPill>
          {/* The sitting so far: each shot with its sage tick, newest at the right. */}
          <ul
            aria-label={copy.taken(shots.length)}
            className={`flex h-[60px] gap-2 overflow-x-auto px-7 ${shots.length ? '' : 'invisible'}`}
          >
            {shots.map((shot) => {
              const thumb = (
                <>
                  {/* biome-ignore lint/performance/noImgElement: a local object URL of her own photo */}
                  <img src={shot.url} alt="" className="block size-full object-cover" />
                  <span className="absolute right-0.5 bottom-0.5 flex size-4 items-center justify-center rounded-pill bg-sage text-white">
                    <Icon name="check" size={10} />
                  </span>
                </>
              );
              const frame =
                'relative block h-[60px] w-12 overflow-hidden rounded-[4px] border-[1.5px] border-white';
              return (
                <li key={shot.key} className="shrink-0">
                  {onRemove ? (
                    <button
                      type="button"
                      aria-label={copy.remove}
                      onClick={() => onRemove(shot.key)}
                      className={`${frame} ${DARK_FOCUS}`}
                      data-testid="piece-camera-thumb"
                    >
                      {thumb}
                    </button>
                  ) : (
                    <span className={frame} data-testid="piece-camera-thumb">
                      {thumb}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-7">
            <CamDisc
              icon="image"
              label={copy.photos}
              onClick={() => library.current?.click()}
              size={48}
              className="justify-self-start"
              testId="piece-camera-photos"
            />
            <Shutter
              label={copy.shutter}
              disabled={!live || full}
              onClick={take}
              testId="piece-camera-shutter"
            />
            {shots.length ? (
              <button
                type="button"
                onClick={done}
                disabled={!canDone}
                data-testid="piece-camera-review"
                className={`inline-flex h-12 items-center justify-self-end rounded-pill bg-ink900 px-5 font-medium font-sans text-[10px] text-cream50 uppercase tracking-[0.2em] shadow-[0_4px_14px_rgb(32_32_33/0.25)] disabled:opacity-60 ${DARK_FOCUS}`}
              >
                {copy.done(shots.length)}
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
      <input
        ref={library}
        type="file"
        multiple
        accept={PHOTO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="piece-camera-photos-input"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])].filter(isPhoto);
          event.target.value = '';
          for (const file of files.slice(0, Math.max(0, max - shots.length))) onAdd(file);
        }}
      />
    </div>
  );
}
