'use client';

import { twin, wardrobe } from '@robes/copy';
import { Icon, type IconName } from '@robes/icons/web';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CAPTURE_QUALITY,
  CAPTURE_TYPE,
  cameraAvailable,
  captureSize,
  shotName,
} from '@/components/wardrobe/camera-capture';
import { PHOTO_ACCEPT } from '@/lib/upload';
import { useSelfieSend } from '@/lib/use-selfie';
import { type Facing, mirrored, selfieConstraints } from './selfie-capture';

const copy = twin.twinPage.selfie;
const cam = wardrobe.camera;
// A viewfinder is dark whatever the theme, so its chrome takes palette tokens, not the semantic
// ones that flip with the ground — the focus ring with them (as the wardrobe camera does).
const DARK_FOCUS =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-cream50';
const ROUND = `inline-flex items-center justify-center rounded-pill bg-cream50 text-ink900 ${DARK_FOCUS}`;
const WIDE =
  'inline-flex min-h-12 flex-1 items-center justify-center rounded-pill px-5 font-medium font-sans text-xs uppercase tracking-[0.2em] disabled:opacity-60';

type Photo = { file: File; url: string; from: 'camera' | 'library' };

// The selfie camera (designs 03–05, Annie 10 Nov): the front camera under a face guide, her photos
// a tap away (the system's picker, design 04), then the review (05): Retake goes back to where
// the photo came from, Use photo reads it and opens Your digital twin. Without a camera (a laptop,
// a refusal) her photos still work. Native twin: mobile/src/features/you/SelfieCamera.tsx.
export function SelfieCamera() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const library = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<Facing>('user');
  const [live, setLive] = useState(false);
  const [refused, setRefused] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const { send, busy, error } = useSelfieSend();

  const stop = useCallback(() => {
    for (const track of stream.current?.getTracks() ?? []) track.stop();
    stream.current = null;
    setLive(false);
  }, []);

  // The stream runs only while the viewfinder shows; the review holds a still.
  useEffect(() => {
    if (photo) return;
    if (!cameraAvailable(window)) {
      setRefused(true);
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia(selfieConstraints(facing))
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
        setRefused(false);
        setLive(true);
      })
      .catch(() => {
        if (!cancelled) setRefused(true);
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, photo, stop]);

  // The still's object URL goes with it.
  useEffect(() => (photo ? () => URL.revokeObjectURL(photo.url) : undefined), [photo]);

  const close = useCallback(() => {
    stop();
    if (window.history.length > 1) router.back();
    else router.replace('/you/model');
  }, [router, stop]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  function keep(file: File, from: Photo['from']) {
    setPhoto({ file, url: URL.createObjectURL(file), from });
  }

  function shoot() {
    const el = video.current;
    if (!el?.videoWidth) return;
    const { width, height } = captureSize(el.videoWidth, el.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(el, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (blob) keep(new File([blob], shotName(Date.now()), { type: CAPTURE_TYPE }), 'camera');
      },
      CAPTURE_TYPE,
      CAPTURE_QUALITY,
    );
  }

  // Back to where the photo came from: her photos again, or the camera.
  function retake() {
    const from = photo?.from;
    setPhoto(null);
    if (from === 'library') library.current?.click();
  }

  const photos = (
    <input
      ref={library}
      type="file"
      accept={PHOTO_ACCEPT}
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      data-testid="selfie-photos-input"
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) keep(file, 'library');
      }}
    />
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo ? copy.review : copy.title}
      className="fixed inset-0 z-45 overflow-hidden bg-ink900 text-cream50"
      data-testid={photo ? 'selfie-review' : 'selfie-camera'}
    >
      {photo ? (
        // biome-ignore lint/performance/noImgElement: a local object URL of her own photo
        <img src={photo.url} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <>
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            aria-hidden
            className={`absolute inset-0 size-full object-cover ${mirrored(facing) ? '-scale-x-100' : ''}`}
          />
          {/* The face guide: an oval with a dashed edge, the frame around it dimmed. */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-[31%] left-1/2 aspect-[1/1.29] w-[62%] max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[1.5px] border-cream50 border-dashed outline-[200vmax] outline-ink900/35 outline-solid"
          />
          {!live ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p
                {...(refused ? { role: 'alert' } : {})}
                className="font-display font-light text-cream50 text-xl italic"
              >
                {refused ? cam.unreachable : cam.waiting}
              </p>
            </div>
          ) : null}
        </>
      )}
      <div className="relative mx-auto flex h-full w-full max-w-[520px] flex-col justify-between px-5 pt-[calc(env(safe-area-inset-top)+8px)] pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <Round icon="close" label={copy.close} onClick={close} />
        {photo ? (
          <div className="flex flex-col gap-4">
            {error ? <Pill role="alert">{error}</Pill> : <Pill>{copy.reviewNote}</Pill>}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={retake}
                className={`${WIDE} bg-cream50 text-ink900 ${DARK_FOCUS}`}
              >
                {copy.retake}
              </button>
              <button
                type="button"
                disabled={busy}
                aria-busy={busy}
                onClick={() => void send(photo.file)}
                className={`${WIDE} bg-ink900 text-cream50 ${DARK_FOCUS}`}
              >
                {copy.use}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <Pill>{copy.hint}</Pill>
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center px-3">
              <Round
                icon="image"
                label={copy.photos}
                onClick={() => library.current?.click()}
                className="size-12 justify-self-start"
              />
              <button
                type="button"
                aria-label={copy.shutter}
                disabled={!live}
                onClick={shoot}
                className={`group size-[76px] justify-self-center rounded-pill border-[3px] border-cream50 p-[4px] disabled:opacity-40 ${DARK_FOCUS}`}
              >
                <span
                  aria-hidden
                  className="block size-full rounded-pill bg-cream50 motion-safe:transition-transform group-active:scale-92"
                />
              </button>
              <Round
                icon="refresh"
                label={copy.flip}
                disabled={!live}
                onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                className="size-12 justify-self-end"
              />
            </div>
          </div>
        )}
      </div>
      {photos}
    </div>
  );
}

// A light disc on the dark frame: close, the camera's turn.
function Round({
  icon,
  label,
  onClick,
  disabled = false,
  className = 'size-11',
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`${ROUND} ${className} disabled:opacity-50`}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

// One line on glass over the frame: the hint, the review's note, or what went wrong.
function Pill({ children, role }: { children: string; role?: 'alert' }) {
  return (
    <p
      role={role}
      aria-live="polite"
      className="self-center rounded-pill bg-ink900/55 px-4 py-2.5 text-center font-sans text-cream50 text-sm"
    >
      {children}
    </p>
  );
}
