'use client';

import { Icon, type IconName } from '@robes/icons/web';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import {
  CAPTURE_QUALITY,
  CAPTURE_TYPE,
  cameraAvailable,
  captureSize,
  shotName,
} from '@/components/wardrobe/camera-capture';

// The parts every camera in the app is built from (Capture PRD: one viewfinder for a look, a
// piece and a photo added to a look): the stream, the still, and the chrome on the dark frame.
// A viewfinder is dark whatever the theme, so its chrome takes palette tokens, not the semantic
// ones that flip with the ground. Native twin: mobile/src/features/capture/CameraParts.tsx.
export const DARK_FOCUS =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-cream50';

// The camera's stream on a <video>, running only while `on`. `refused` covers a refusal, no
// camera and an insecure page alike: her photos still work.
export function useCameraStream(
  constraints: MediaStreamConstraints,
  on: boolean,
): {
  video: RefObject<HTMLVideoElement | null>;
  live: boolean;
  refused: boolean;
  shoot: () => Promise<File | null>;
  stop: () => void;
} {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [refused, setRefused] = useState(false);

  const stop = useCallback(() => {
    for (const track of stream.current?.getTracks() ?? []) track.stop();
    stream.current = null;
    setLive(false);
  }, []);

  useEffect(() => {
    if (!on) return;
    if (!cameraAvailable(window)) {
      setRefused(true);
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia(constraints)
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
  }, [constraints, on, stop]);

  // The frame as a JPEG, scaled to the capture size before it leaves the page.
  const shoot = useCallback(
    () =>
      new Promise<File | null>((resolve) => {
        const el = video.current;
        if (!el?.videoWidth) {
          resolve(null);
          return;
        }
        const { width, height } = captureSize(el.videoWidth, el.videoHeight);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(el, 0, 0, width, height);
        canvas.toBlob(
          (blob) =>
            resolve(blob ? new File([blob], shotName(Date.now()), { type: CAPTURE_TYPE }) : null),
          CAPTURE_TYPE,
          CAPTURE_QUALITY,
        );
      }),
    [],
  );

  return { video, live, refused, shoot, stop };
}

// The four corner guides around the subject (canvas 1c / 3c): 26px, 1.5px, a 4px turn.
export function Brackets({
  className = 'inset-x-10 top-[76px] bottom-[196px]',
}: {
  className?: string;
}) {
  const edge = 'absolute size-[26px] border-white/90';
  return (
    <span aria-hidden className={`pointer-events-none absolute ${className}`}>
      <span className={`${edge} top-0 left-0 rounded-tl-[4px] border-t-[1.5px] border-l-[1.5px]`} />
      <span
        className={`${edge} top-0 right-0 rounded-tr-[4px] border-t-[1.5px] border-r-[1.5px]`}
      />
      <span
        className={`${edge} bottom-0 left-0 rounded-bl-[4px] border-b-[1.5px] border-l-[1.5px]`}
      />
      <span
        className={`${edge} right-0 bottom-0 rounded-br-[4px] border-r-[1.5px] border-b-[1.5px]`}
      />
    </span>
  );
}

// A cream disc on the frame: close, back, her photos, retake. The glyph sits in a 44px target.
export function CamDisc({
  icon,
  label,
  onClick,
  size = 40,
  disabled = false,
  className = '',
  testId,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  size?: 40 | 48;
  disabled?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={`inline-flex size-12 items-center justify-center rounded-pill disabled:opacity-50 ${DARK_FOCUS} ${className}`}
    >
      <span
        className={`flex items-center justify-center rounded-pill bg-cream50/95 text-ink900 shadow-[0_2px_8px_rgb(32_32_33/0.15)] ${
          size === 48 ? 'size-12' : 'size-10'
        }`}
      >
        <Icon name={icon} size={size === 48 ? 18 : 15} />
      </span>
    </button>
  );
}

// One line on glass over the frame: the hint, the review's question, or what went wrong.
export function CamPill({ children, role }: { children: string; role?: 'alert' }) {
  return (
    <p
      role={role}
      aria-live="polite"
      className="max-w-[calc(100%-2rem)] self-center rounded-pill bg-ink900/55 px-3.5 py-2 text-center font-sans text-white text-xs tracking-[0.01em] backdrop-blur-[10px]"
    >
      {children}
    </p>
  );
}

// The shutter: a 78px white ring around a white disc.
export function Shutter({
  label,
  onClick,
  disabled,
  testId,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={`group size-[78px] rounded-pill border-4 border-white p-1 disabled:opacity-40 ${DARK_FOCUS}`}
    >
      <span
        aria-hidden
        className="block size-full rounded-pill bg-white motion-safe:transition-transform group-active:scale-92"
      />
    </button>
  );
}

// The white flash a shot plays (never a photo from her library).
export function Flash({ on, ms }: { on: boolean; ms: number }) {
  return (
    <span
      aria-hidden
      style={{ transitionDuration: on ? '0ms' : `${ms}ms` }}
      className={`pointer-events-none absolute inset-0 bg-white motion-safe:transition-opacity motion-safe:ease-out ${
        on ? 'opacity-95' : 'opacity-0'
      }`}
    />
  );
}
