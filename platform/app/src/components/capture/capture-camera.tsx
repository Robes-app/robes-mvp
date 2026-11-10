'use client';

import { Icon } from '@robes/icons/web';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CAMERA_CONSTRAINTS } from '@/components/wardrobe/camera-capture';
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

// The flash a shot plays over the review (canvas `cxFlash`, .45s ease-out).
const FLASH_MS = 450;

export interface CaptureCameraCopy {
  title: string;
  hint: string;
  close: string;
  photos: string;
  shutter: string;
  review: string;
  reviewNote: string;
  back: string;
  retake: string;
  use: string;
  denied: string;
  // The review as two pills (Add a photo to a look, Capture PRD 3.4): Retake reads this when the
  // photo came from her library, and reopens it.
  another?: string;
}

// The review's pills (PRD 3.4): 48px, the label caps at 9px and 0.22em.
const PILL =
  'inline-flex h-12 flex-1 items-center justify-center rounded-pill px-[22px] font-medium font-sans text-[9px] uppercase tracking-[0.22em] disabled:opacity-60';

type Photo = { file: File; url: string; from: 'camera' | 'library' };

// The camera for one photograph (Capture PRD 1c.1–1c.2; the canvas's frame 1c): the viewfinder
// over the screen that opened it — corner guides, the hint on glass, her photos bottom-left, the
// shutter — then the review of the still: back and Retake return to the viewfinder, the ink ✓ is
// Use photo. A shot flashes; a photo from her library does not. With the camera refused her
// photos still work. Native twin: mobile/src/features/capture/CaptureCamera.tsx.
export function CaptureCamera({
  copy,
  onUse,
  onClose,
  busy = false,
  error = null,
  review = 'discs',
}: {
  copy: CaptureCameraCopy;
  // `discs` (a look, canvas 1c): back top-left, Retake and the ink ✓. `pills` (a photo added to a
  // look, PRD 3.4): × stays, and Retake | ADD TO LOOK sit side by side; no flash, no question.
  review?: 'discs' | 'pills';
  onUse: (file: File) => void;
  onClose: () => void;
  // Use photo is working (the upload): the review holds, its buttons stand down.
  busy?: boolean;
  error?: string | null;
}) {
  const library = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [flash, setFlash] = useState(false);
  // The stream runs only while the viewfinder shows; the review holds a still.
  const { video, live, refused, shoot, stop } = useCameraStream(CAMERA_CONSTRAINTS, !photo);

  // The still's object URL goes with it.
  useEffect(() => (photo ? () => URL.revokeObjectURL(photo.url) : undefined), [photo]);

  const close = useCallback(() => {
    stop();
    onClose();
  }, [onClose, stop]);
  const retake = useCallback(() => setPhoto(null), []);
  const pills = review === 'pills';
  // Another: her library again, the still held until she picks or cancels.
  const again = () => (photo?.from === 'library' ? library.current?.click() : retake());

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return;
      event.preventDefault();
      if (photo) retake();
      else close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, close, photo, retake]);

  const keep = (file: File, from: Photo['from']) => {
    setPhoto({ file, url: URL.createObjectURL(file), from });
    if (from !== 'camera' || pills) return;
    setFlash(true);
    // Two frames on, then it fades: the transition needs the lit state painted first.
    requestAnimationFrame(() => requestAnimationFrame(() => setFlash(false)));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo ? copy.review : copy.title}
      className="fixed inset-0 z-45 overflow-hidden bg-ink900 text-cream50 motion-safe:animate-fade-in"
      data-testid={photo ? 'capture-review' : 'capture-camera'}
    >
      {photo ? (
        // biome-ignore lint/performance/noImgElement: a local object URL of her own photo
        <img src={photo.url} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          aria-hidden
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <Flash on={flash} ms={FLASH_MS} />
      <div className="relative mx-auto h-full w-full max-w-[520px]">
        {photo ? null : <Brackets />}
        <CamDisc
          icon={photo && !pills ? 'back' : 'close'}
          label={photo && !pills ? copy.back : copy.close}
          onClick={photo && !pills ? retake : close}
          disabled={busy}
          className="absolute top-[calc(env(safe-area-inset-top)+12px)] left-3"
          testId="capture-close"
        />
        {!photo && !live ? (
          <div className="absolute inset-x-8 top-1/3 flex justify-center">
            {refused ? <CamPill role="alert">{copy.denied}</CamPill> : null}
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+36px)] flex flex-col items-stretch gap-[22px]">
          {error ? (
            <CamPill role="alert">{error}</CamPill>
          ) : photo && pills ? null : (
            <CamPill>{photo ? copy.reviewNote : copy.hint}</CamPill>
          )}
          {photo && pills ? (
            <div className="flex gap-2.5 px-5">
              <button
                type="button"
                disabled={busy}
                onClick={again}
                data-testid="capture-retake"
                className={`${PILL} bg-cream50/95 text-ink900 backdrop-blur-[8px] ${DARK_FOCUS}`}
              >
                {photo.from === 'library' ? (copy.another ?? copy.retake) : copy.retake}
              </button>
              <button
                type="button"
                disabled={busy}
                aria-busy={busy}
                onClick={() => onUse(photo.file)}
                data-testid="capture-use"
                className={`${PILL} bg-ink900 text-cream50 ${DARK_FOCUS}`}
              >
                {copy.use}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center px-7">
              {photo ? (
                <CamDisc
                  icon="refresh"
                  label={copy.retake}
                  onClick={retake}
                  size={48}
                  disabled={busy}
                  className="justify-self-start"
                  testId="capture-retake"
                />
              ) : (
                <CamDisc
                  icon="image"
                  label={copy.photos}
                  onClick={() => library.current?.click()}
                  size={48}
                  className="justify-self-start"
                  testId="capture-photos"
                />
              )}
              {photo ? (
                <button
                  type="button"
                  aria-label={copy.use}
                  title={copy.use}
                  aria-busy={busy}
                  disabled={busy}
                  onClick={() => onUse(photo.file)}
                  data-testid="capture-use"
                  className={`flex size-[78px] items-center justify-center rounded-pill bg-ink900 text-cream50 shadow-[0_0_0_4px_white,0_4px_14px_rgb(32_32_33/0.25)] disabled:opacity-60 ${DARK_FOCUS}`}
                >
                  <Icon name="check" size={26} />
                </button>
              ) : (
                <Shutter
                  label={copy.shutter}
                  disabled={!live}
                  testId="capture-shutter"
                  onClick={() =>
                    void shoot().then((file) => {
                      if (file) keep(file, 'camera');
                    })
                  }
                />
              )}
              <span />
            </div>
          )}
        </div>
      </div>
      <input
        ref={library}
        type="file"
        accept={PHOTO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="capture-photos-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) keep(file, 'library');
        }}
      />
    </div>
  );
}
