'use client';

import { type ImgHTMLAttributes, useEffect, useRef, useState } from 'react';
import { type Aspect, aspects } from './aspect';
import { blurhashToDataUrl } from './blurhash';
import { cn } from './cn';

export interface ImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes' | 'alt'> {
  src: string;
  srcSet?: string;
  sizes?: string;
  // Required: describe the photo, or pass '' when it's decorative.
  alt: string;
  aspect?: Aspect;
  blurhash?: string | null;
  priority?: boolean;
  frameClassName?: string;
}

type Status = 'loading' | 'loaded' | 'error';

// A fixed-ratio frame: the box is sized before any bytes arrive, so there's no layout shift.
export function Image({
  src,
  srcSet,
  sizes,
  alt,
  aspect = '4:5',
  blurhash,
  priority = false,
  className,
  frameClassName,
  onLoad,
  onError,
  ...rest
}: ImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [placeholder, setPlaceholder] = useState<string | null>(null);

  useEffect(() => {
    setPlaceholder(blurhash ? blurhashToDataUrl(blurhash) : null);
  }, [blurhash]);

  // A cached image can finish before hydration attaches onLoad.
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setStatus('loaded');
  }, []);

  return (
    <div
      data-status={status}
      className={cn('relative overflow-hidden bg-surface-sunk', aspects[aspect], frameClassName)}
    >
      {placeholder && status !== 'loaded' ? (
        // biome-ignore lint/performance/noImgElement: a 32px data URL; nothing to optimise.
        <img
          src={placeholder}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      {/* biome-ignore lint/performance/noImgElement: our media delivery supplies srcSet/sizes, and the package runs outside Next. */}
      <img
        {...rest}
        ref={ref}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        onLoad={(event) => {
          setStatus('loaded');
          onLoad?.(event);
        }}
        onError={(event) => {
          setStatus('error');
          onError?.(event);
        }}
        className={cn(
          'absolute inset-0 size-full object-cover motion-safe:transition-opacity motion-safe:duration-200',
          status === 'loaded' ? 'opacity-100' : 'opacity-0',
          className,
        )}
      />
    </div>
  );
}
