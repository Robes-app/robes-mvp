'use client';

import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Button, Dialog } from '@robes/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import {
  Brackets,
  CamDisc,
  CamPill,
  DARK_FOCUS,
  Flash,
  Shutter,
  useCameraStream,
} from '@/components/capture/camera-parts';
import { isPhoto, REVIEW_MAX, type ShotSession } from '@/lib/add-flow';
import { PHOTO_ACCEPT } from '@/lib/upload';
import { CAMERA_CONSTRAINTS, cameraAvailable } from './camera-capture';

const copy = wardrobe.capture.camera;
const leave = wardrobe.camera;
// The flash a shot plays (Capture PRD 3c.2: 380 ms).
const FLASH_MS = 380;

export function canUseCamera(): boolean {
  return cameraAvailable(window);
}

// Wardrobe › Photo, the camera (Capture PRD 3c.2; canvas frame 3c): the viewfinder stays open
// between shots. Each shot flashes, starts its read and joins the strip above the controls with
// a sage tick; from the first one the counter says how many are ready, the hint moves on, and
// the ink REVIEW n pill opens the review. Her photos (several at once) join the same sitting.
// Nothing files from here; closing with shots asks first. The look camera shares its parts
// (components/capture). Native twin: mobile/src/features/wardrobe/Camera.tsx.
export function Camera({
  session,
  onReview,
  onClose,
  onUseDevice,
}: {
  session: ShotSession;
  onReview: () => void;
  onClose: () => void;
  onUseDevice: () => void;
}) {
  const library = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState(false);
  const [asking, setAsking] = useState(false);
  const { shots } = session;
  const { video, live, refused, shoot, stop } = useCameraStream(CAMERA_CONSTRAINTS, true);
  const { track } = useAnalytics().analytics;
  useEffect(() => track('camera_opened'), [track]);
  const full = shots.length >= REVIEW_MAX;

  const quit = useCallback(() => {
    stop();
    session.reset();
    onClose();
  }, [onClose, session, stop]);

  // Nothing taken is dropped without a word.
  const close = useCallback(() => {
    if (shots.length === 0) quit();
    else setAsking(true);
  }, [quit, shots.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !asking) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [asking, close]);

  function take() {
    if (full) return;
    setFlash(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setFlash(false)));
    void shoot().then((file) => {
      if (file) void session.add(file);
    });
  }

  function review() {
    if (shots.length === 0) return;
    track('camera_filed', { n: shots.length });
    stop();
    onReview();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={leave.title}
      className="fixed inset-0 z-45 overflow-hidden bg-ink900 text-cream50 motion-safe:animate-fade-in"
      data-testid="piece-camera"
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
          onClick={close}
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
            <button
              type="button"
              onClick={onUseDevice}
              className={`inline-flex min-h-11 items-center rounded-pill border border-cream50/40 px-5 font-medium font-sans text-[10px] uppercase tracking-[0.2em] ${DARK_FOCUS}`}
            >
              {leave.useDevice}
            </button>
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+36px)] flex flex-col items-stretch gap-4">
          <CamPill>{full ? copy.full : shots.length ? copy.next : copy.hint}</CamPill>
          {/* The sitting so far: each shot with its sage tick, newest at the right. */}
          <ul
            aria-label={leave.taken(shots.length)}
            className={`flex h-[60px] gap-2 overflow-x-auto px-7 ${shots.length ? '' : 'invisible'}`}
          >
            {shots.map((shot) => (
              <li
                key={shot.key}
                className="relative h-[60px] w-12 shrink-0 overflow-hidden rounded-[4px] border-[1.5px] border-white"
              >
                {/* biome-ignore lint/performance/noImgElement: a local object URL of her own photo */}
                <img src={shot.url} alt="" className="block size-full object-cover" />
                <span className="absolute right-0.5 bottom-0.5 flex size-4 items-center justify-center rounded-pill bg-sage text-white">
                  <Icon name="check" size={10} />
                </span>
              </li>
            ))}
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
                onClick={review}
                data-testid="piece-camera-review"
                className={`inline-flex h-12 items-center justify-self-end rounded-pill bg-ink900 px-5 font-medium font-sans text-[10px] text-cream50 uppercase tracking-[0.2em] shadow-[0_4px_14px_rgb(32_32_33/0.25)] ${DARK_FOCUS}`}
              >
                {copy.review(shots.length)}
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
          for (const file of files.slice(0, Math.max(0, REVIEW_MAX - shots.length))) {
            void session.add(file);
          }
        }}
      />
      {/* The app's own confirm, over the camera: nothing taken is dropped without a word. */}
      <Dialog
        open={asking}
        onOpenChange={setAsking}
        title={leave.leave(shots.length)}
        description={leave.leaveBody}
        footer={
          <>
            <Button variant="primary" onClick={quit}>
              {leave.leaveConfirm}
            </Button>
            <Button variant="quiet" onClick={() => setAsking(false)}>
              {leave.stay}
            </Button>
          </>
        }
      />
    </div>
  );
}
