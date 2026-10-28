'use client';

import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Button, Dialog } from '@robes/ui';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { isPhoto, REVIEW_MAX, type ShotSession } from '@/lib/add-flow';
import { PHOTO_ACCEPT } from '@/lib/upload';
import {
  CAMERA_CONSTRAINTS,
  CAPTURE_QUALITY,
  CAPTURE_TYPE,
  cameraAvailable,
  captureSize,
  FLASH_MS,
  shotName,
} from './camera-capture';

const copy = wardrobe.camera;
const add = wardrobe.add;
// A viewfinder is dark whatever the theme, so its chrome takes palette tokens, not the
// semantic ones that flip with the ground — the focus ring with them.
const DARK_FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream50';

// No camera API, or an insecure page: the OS capture input answers in the same tap.
export function canUseCamera(): boolean {
  return cameraAvailable(window);
}

// "Take a photo" (design "Add Piece — Handoff"): the camera in the app. Every shot is read the
// moment it is taken — Robes counts what is in the frame, so one photo holds one piece or five —
// and the tray says what it has found. Review opens on them; nothing files from here, and where
// they go was chosen on the Add pieces sheet (redline 03). The last-photo thumb is the camera
// roll. Native twin: mobile/src/features/wardrobe/Camera.tsx.
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
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const rollId = useId();
  const [live, setLive] = useState(false);
  const [refused, setRefused] = useState(false);
  const [flash, setFlash] = useState(false);
  const [asking, setAsking] = useState(false);
  const { shots } = session;
  const { track } = useAnalytics().analytics;
  useEffect(() => track('camera_opened'), [track]);

  const stop = useCallback(() => {
    for (const track of stream.current?.getTracks() ?? []) track.stop();
    stream.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia(CAMERA_CONSTRAINTS)
      .then((media) => {
        if (cancelled) {
          for (const track of media.getTracks()) track.stop();
          return;
        }
        stream.current = media;
        const el = video.current;
        if (el) {
          el.srcObject = media;
          void el.play().catch(() => {});
        }
        setLive(true);
      })
      .catch(() => {
        if (!cancelled) setRefused(true);
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  const leave = useCallback(() => {
    stop();
    session.reset();
    onClose();
  }, [onClose, session, stop]);

  // Nothing taken is dropped without a word.
  const close = useCallback(() => {
    if (shots.length === 0) leave();
    else setAsking(true);
  }, [leave, shots.length]);

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

  function shoot() {
    const el = video.current;
    if (!el?.videoWidth) return;
    const { width, height } = captureSize(el.videoWidth, el.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(el, 0, 0, width, height);
    setFlash(true);
    window.setTimeout(() => setFlash(false), FLASH_MS);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        void session.add(new File([blob], shotName(Date.now()), { type: CAPTURE_TYPE }));
      },
      CAPTURE_TYPE,
      CAPTURE_QUALITY,
    );
  }

  function review() {
    if (shots.length === 0 || session.reading) return;
    track('camera_filed', { n: shots.length });
    stop();
    onReview();
  }

  const last = shots.at(-1);
  const canReview = shots.length > 0 && !session.reading;
  const tray = shots.length
    ? session.reading
      ? add.shots.reading
      : add.shots.found(session.found)
    : '';
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      className="fixed inset-0 z-45 flex flex-col bg-ink900 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-cream50"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[520px] flex-1 flex-col px-4 pt-2 pb-3">
        <div className="grid h-14 shrink-0 grid-cols-[44px_1fr_44px] items-center">
          <button
            type="button"
            aria-label={copy.close}
            onClick={close}
            className={`inline-flex size-11 items-center justify-center rounded-pill bg-cream50/12 ${DARK_FOCUS}`}
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-soft bg-ink900">
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            aria-hidden
            className="absolute inset-0 size-full object-cover"
          />
          <span
            aria-hidden
            className="absolute top-[18px] left-[18px] size-[26px] border-cream50/75 border-t-[1.5px] border-l-[1.5px]"
          />
          <span
            aria-hidden
            className="absolute top-[18px] right-[18px] size-[26px] border-cream50/75 border-t-[1.5px] border-r-[1.5px]"
          />
          <span
            aria-hidden
            className="absolute bottom-[18px] left-[18px] size-[26px] border-cream50/75 border-b-[1.5px] border-l-[1.5px]"
          />
          <span
            aria-hidden
            className="absolute right-[18px] bottom-[18px] size-[26px] border-cream50/75 border-r-[1.5px] border-b-[1.5px]"
          />
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 bg-white ${
              flash
                ? 'opacity-75'
                : 'opacity-0 motion-safe:transition-opacity motion-safe:duration-200'
            }`}
          />
          {refused || !live ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p
                {...(refused ? { role: 'alert' } : {})}
                className="font-display font-light text-cream50 text-xl italic"
              >
                {refused ? copy.unreachable : copy.waiting}
              </p>
              <button
                type="button"
                onClick={onUseDevice}
                className={`inline-flex min-h-11 items-center rounded-pill border border-cream50/40 px-5 font-medium font-sans text-[10px] uppercase tracking-[0.2em] ${DARK_FOCUS}`}
              >
                {copy.useDevice}
              </button>
            </div>
          ) : null}
        </div>
        <p
          aria-live="polite"
          className="mt-3 min-h-4 text-center font-medium font-sans text-[10px] uppercase tracking-[0.16em]"
        >
          {tray}
        </p>
        <div className="grid h-28 shrink-0 grid-cols-[1fr_auto_1fr] items-center">
          {/* The last shot, so she can see what Robes has; a tap opens the camera roll. */}
          <label
            htmlFor={rollId}
            className="relative flex h-[60px] w-12 cursor-pointer items-center justify-center justify-self-start overflow-hidden rounded-[8px] border border-cream50/75 bg-cream50/12 focus-within:outline-2 focus-within:outline-cream50 focus-within:outline-offset-2"
          >
            {last ? (
              // biome-ignore lint/performance/noImgElement: a local object URL of her own photo
              <img src={last.url} alt="" className="block size-full object-cover" />
            ) : (
              <Icon name="image" size={20} />
            )}
            <span className="sr-only">
              {add.shots.roll}
              {shots.length ? `, ${copy.taken(shots.length)}` : ''}
            </span>
            <input
              id={rollId}
              type="file"
              multiple
              accept={PHOTO_ACCEPT}
              className="sr-only"
              onChange={(event) => {
                const files = [...(event.target.files ?? [])].filter(isPhoto);
                event.target.value = '';
                for (const file of files.slice(0, REVIEW_MAX)) void session.add(file);
              }}
            />
          </label>
          <button
            type="button"
            aria-label={copy.shutter}
            disabled={refused}
            onClick={shoot}
            className={`group size-[72px] justify-self-center rounded-pill border-2 border-cream50 p-[4px] disabled:opacity-40 ${DARK_FOCUS}`}
          >
            <span
              aria-hidden
              className="block size-full rounded-pill bg-cream50 motion-safe:transition-transform group-active:scale-92"
            />
          </button>
          {shots.length ? (
            <button
              type="button"
              disabled={!canReview}
              onClick={review}
              className={`min-h-11 justify-self-end px-1 font-medium font-sans text-[10px] text-cream50/70 uppercase tracking-[0.22em] disabled:text-cream50/35 ${DARK_FOCUS}`}
            >
              {add.shots.review(shots.length)}
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>
      {/* The app's own confirm, over the camera: nothing taken is dropped without a word. */}
      <Dialog
        open={asking}
        onOpenChange={setAsking}
        title={copy.leave(shots.length)}
        description={copy.leaveBody}
        footer={
          <>
            <Button variant="primary" onClick={leave}>
              {copy.leaveConfirm}
            </Button>
            <Button variant="quiet" onClick={() => setAsking(false)}>
              {copy.stay}
            </Button>
          </>
        }
      />
    </div>
  );
}
