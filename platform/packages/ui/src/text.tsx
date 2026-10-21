import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

const tones = {
  default: 'text-ink',
  muted: 'text-ink-muted',
  faint: 'text-ink-faint',
  danger: 'text-danger',
  success: 'text-success',
} as const;

export type TextTone = keyof typeof tones;

const textSizes = {
  body: 'text-base leading-relaxed font-light',
  small: 'text-sm leading-normal',
  caption: 'text-xs leading-normal',
} as const;

// The sans never goes italic (brand-and-design.md §3): an italic line is Cormorant, a step up
// so it never renders below 17px.
const italicSizes = {
  body: 'text-xl leading-snug',
  small: 'text-lg leading-snug',
  caption: 'text-lg leading-snug',
} as const;

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span' | 'div' | 'li';
  size?: keyof typeof textSizes;
  tone?: TextTone;
  italic?: boolean;
  children?: ReactNode;
}

export function Text({
  as: Tag = 'p',
  size = 'body',
  tone = 'default',
  italic = false,
  className,
  ...rest
}: TextProps) {
  const face = italic
    ? cn('font-display font-light italic', italicSizes[size])
    : cn('font-sans', textSizes[size]);
  return <Tag {...rest} className={cn(face, tones[tone], className)} />;
}

// Cormorant never renders below 17px (brand-and-design.md §3.1): the smallest step is 18px.
const headingSizes = {
  sm: 'text-lg leading-snug',
  md: 'text-2xl leading-tight',
  lg: 'text-3xl leading-tight',
  xl: 'text-4xl leading-tight',
  '2xl': 'text-5xl leading-none',
} as const;

export type HeadingSize = keyof typeof headingSizes;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4;
  size?: HeadingSize;
  italic?: boolean;
  tone?: TextTone;
  children?: ReactNode;
}

const defaultSize: Record<NonNullable<HeadingProps['level']>, HeadingSize> = {
  1: 'xl',
  2: 'lg',
  3: 'md',
  4: 'sm',
};

export function Heading({
  level = 2,
  size,
  italic = false,
  tone = 'default',
  className,
  ...rest
}: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag
      {...rest}
      className={cn(
        'font-display font-light',
        headingSizes[size ?? defaultSize[level]],
        italic && 'italic',
        tones[tone],
        className,
      )}
    />
  );
}

export interface EyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

// Author in sentence case; the style uppercases it (brand-and-design.md §1).
export function Eyebrow({ className, ...rest }: EyebrowProps) {
  return (
    <p
      {...rest}
      className={cn(
        'font-sans text-xs font-medium uppercase tracking-[0.2em] text-ink-faint',
        className,
      )}
    />
  );
}
