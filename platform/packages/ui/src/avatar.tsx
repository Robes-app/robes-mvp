'use client';

import { useState } from 'react';
import { cn } from './cn';

const sizes = {
  sm: 'size-8 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-16 text-lg',
} as const;

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : '';
  return `${first}${last}`.toLocaleUpperCase('en-GB');
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill border border-hairline bg-surface-sunk font-sans font-medium text-ink',
        sizes[size],
        className,
      )}
    >
      {showImage && src ? (
        // biome-ignore lint/performance/noImgElement: framework-agnostic primitive; src is already a sized rendition.
        <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
