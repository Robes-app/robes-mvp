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

const tones = {
  filled: 'border border-hairline bg-surface-sunk font-sans font-medium',
  // Felix's top-bar avatar: a 30px `sage-mid` disc, one Inter 500 initial at 11, no edge (D6,
  // 2026-11-06; it replaces the iOS navigation redline's ring). It overrides `size`.
  nav: 'size-[30px] bg-sage-mid font-sans font-medium text-[11px] leading-none',
} as const;

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  tone?: keyof typeof tones;
  className?: string;
}

export function Avatar({ name, src, size = 'md', tone = 'filled', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const letters = initials(name);
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill text-ink',
        tone === 'nav' ? null : sizes[size],
        tones[tone],
        className,
      )}
    >
      {showImage && src ? (
        // biome-ignore lint/performance/noImgElement: framework-agnostic primitive; src is already a sized rendition.
        <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden>{tone === 'nav' ? letters.slice(0, 1) : letters}</span>
      )}
    </span>
  );
}
