'use client';

import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Button, Dialog } from '@robes/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PHOTO_ACCEPT } from '@/lib/upload';
import {
  CAMERA_CONSTRAINTS,
  CAMERA_MODE_KEY,
  CAPTURE_QUALITY,
  CAPTURE_TYPE,
  type CameraMode,
  cameraAvailable,
  captureSize,
  FLASH_MS,
  isCameraMode,
  shotName,
} from './camera-capture';

const copy = wardrobe.camera;
// A viewfinder is dark whatever the theme, so its chrome takes palette tokens, not the
// semantic ones that flip with the ground — the focus ring with them.
const DARK_FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream50';

function readMode(): CameraMode {
  try {
    const stored = window.localStorage.getItem(CAMERA_MODE_KEY);
    if (isCameraMode(stored)) return stored;
  } catch {
    // Private mode or blocked storage: Single, as it would be on a first visit.
  }
  return 'single';
}

function rememberMode(mode: CameraMode): void {
  try {
    window.localStorage.setItem(CAMERA_MODE_KEY, mode);
  } catch {
    // The pick still holds for this visit.
  }
}

// "Take a photo" (legacy Add_Pieces 1c): the in-app camera, with the OS camera behind it when
// the browser has none. Single files one shot; Several keeps shooting and Done files the lot.
export function CameraDoor({
  onShots,
  disabled = false,
  className,
  children,
}: {
  onShots: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const openCamera = () => {
    // No camera API, or an insecure page: the OS input answers inside the same tap.
    if (cameraAvailable(window)) setOpen(true);
    else input.current?.click();
  };
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={openCamera}
        className={className ?? ''}
        data-testid="camera-door"
      >
        {children ?? copy.open}
      </button>
      <input
        ref={input}
        type="file"
        accept={PHOTO_ACCEPT}
        capture="environment"
        aria-label={copy.open}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = '';
          if (files.length > 0) onShots(files);
        }}
      />
      {open ? (
        <Camera
          onClose={() => setOpen(false)}
          onShots={onShots}
          onUseDevice={() => {
            setOpen(false);
            input.current?.click();
          }}
        />
      ) : null}
    </>
  );
}

interface Shot {
  file: File;
  url: string;
}

function Camera({
  onClose,
  onShots,
  onUseDevice,
}: {
  onClose: () => void;
  onShots: (files: File[]) => void;
  onUseDevice: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<CameraMode>(readMode);
  const [shots, setShots] = useState<Shot[]>([]);
  const [live, setLive] = useState(false);
  const [refused, setRefused] = useState(false);
  const [flash, setFlash] = useState(false);
  const [asking, setAsking] = useState(false);

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

  // Object URLs for the thumbnail only; the files themselves go on to the upload.
  useEffect(() => {
    return () => {
      for (const shot of shots) URL.revokeObjectURL(shot.url);
    };
  }, [shots]);

  const leave = useCallback(() => {
    stop();
    onClose();
  }, [onClose, stop]);

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

  function pickMode(next: CameraMode) {
    setMode(next);
    rememberMode(next);
  }

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
        const file = new File([blob], shotName(Date.now()), { type: CAPTURE_TYPE });
        // Single hands its one shot straight to the read; Several collects.
        if (mode === 'single') {
          leave();
          onShots([file]);
          return;
        }
        setShots((taken) => [...taken, { file, url: URL.createObjectURL(blob) }]);
      },
      CAPTURE_TYPE,
      CAPTURE_QUALITY,
    );
  }

  function done() {
    if (shots.length === 0) return;
    const files = shots.map((shot) => shot.file);
    stop();
    onClose();
    onShots(files);
  }

  const last = shots.at(-1);
  const several = mode === 'several';
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
            className={`inline-flex size-11 items-center justify-center rounded-pill ${DARK_FOCUS}`}
          >
            <Icon name="close" size={22} />
          </button>
          <div
            role="radiogroup"
            aria-label={copy.mode}
            className="inline-flex justify-self-center gap-[2px] rounded-pill bg-cream50/15 p-[3px]"
          >
            {(['single', 'several'] as const).map((option) => (
              // biome-ignore lint/a11y/useSemanticElements: a WAI-ARIA radio group of buttons; a native radio can't take the pill segment styling.
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={mode === option}
                onClick={() => pickMode(option)}
                className={`h-8 min-w-[86px] rounded-pill px-3.5 font-medium font-sans text-[9.5px] uppercase tracking-[0.22em] ${
                  mode === option ? 'bg-warm text-ink900' : 'text-cream50/75'
                } ${DARK_FOCUS}`}
              >
                {copy[option]}
              </button>
            ))}
          </div>
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
          {refused ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p role="alert" className="font-display font-light text-cream50 text-xl italic">
                {copy.unreachable}
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
        <div className="grid h-28 shrink-0 grid-cols-[1fr_auto_1fr] items-center">
          {last ? (
            <span className="relative block w-12 justify-self-start overflow-hidden rounded-[8px] border border-cream50/35">
              {/* The last shot, so she can see what Robes has; the count says how many. */}
              <img src={last.url} alt="" className="block h-[60px] w-12 object-cover" />
              <span className="absolute right-[3px] bottom-[3px] min-w-[18px] rounded-pill bg-warm px-[5px] text-center font-medium font-sans text-[10px] text-ink900 leading-[18px]">
                {shots.length}
              </span>
              <span className="sr-only">{copy.taken(shots.length)}</span>
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            aria-label={copy.shutter}
            disabled={!live}
            onClick={shoot}
            className={`group size-[74px] justify-self-center rounded-pill border-[3px] border-cream50 p-[5px] disabled:opacity-40 ${DARK_FOCUS}`}
          >
            <span
              aria-hidden
              className="block size-full rounded-pill bg-cream50 motion-safe:transition-transform group-active:scale-92"
            />
          </button>
          {several ? (
            <button
              type="button"
              disabled={shots.length === 0}
              onClick={done}
              className={`min-h-11 justify-self-end px-1 font-medium font-sans text-[10px] uppercase tracking-[0.22em] disabled:text-cream50/35 ${DARK_FOCUS}`}
            >
              {copy.done}
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
