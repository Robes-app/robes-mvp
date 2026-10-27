import type { HTMLAttributes, ReactNode } from 'react';
import { type Aspect, aspects } from './aspect';
import { cn } from './cn';
import { Skeleton } from './skeleton';
import { Eyebrow, Heading, type HeadingSize, Text } from './text';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  as?: 'article' | 'div' | 'li' | 'section';
  media?: ReactNode;
  eyebrow?: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  titleSize?: HeadingSize;
  // Anything that sits ON the card rather than in its flow — an action in a corner, a mark on
  // the photograph. The caller positions it; the card only gives it a containing block.
  overlay?: ReactNode;
}

// Cards get a hairline, never a shadow (brand-and-design.md §4.5): beta's white card, raised off
// the cream page (Native parity handoff 2026-10-25; the native twin is ui-native Card.tsx).
export function Card({
  as: Tag = 'article',
  media,
  eyebrow,
  title,
  meta,
  headingLevel = 3,
  titleSize,
  overlay,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      {...rest}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-soft border border-hairline bg-surface-raised',
        className,
      )}
    >
      {media}
      {eyebrow || title || meta || children ? (
        <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-4">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          {title ? (
            <Heading level={headingLevel} size={titleSize ?? 'md'}>
              {title}
            </Heading>
          ) : null}
          {meta ? (
            <Text size="caption" tone="faint">
              {meta}
            </Text>
          ) : null}
          {children}
        </div>
      ) : null}
      {overlay}
    </Tag>
  );
}

// The skeleton twin: same frame, same padding, so nothing shifts when the card lands.
export function CardSkeleton({
  aspect = '4:5',
  className,
}: {
  aspect?: Aspect;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex flex-col overflow-hidden rounded-soft border border-hairline bg-surface-raised',
        className,
      )}
    >
      <Skeleton className={cn('w-full rounded-none', aspects[aspect])} />
      <div className="flex flex-col gap-2.5 px-4 pt-3.5 pb-4">
        <Skeleton shape="text" className="h-3 w-16" />
        <Skeleton shape="text" className="h-6 w-3/4" />
        <Skeleton shape="text" className="h-3 w-1/2" />
      </div>
    </div>
  );
}
