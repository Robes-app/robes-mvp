import type { HTMLAttributes, ReactNode } from 'react';
import { type Aspect, aspects } from './aspect';
import { cn } from './cn';
import { Skeleton } from './skeleton';
import { Eyebrow, Heading, Text } from './text';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  as?: 'article' | 'div' | 'li' | 'section';
  media?: ReactNode;
  eyebrow?: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  headingLevel?: 2 | 3 | 4;
}

// Cards get a hairline, never a shadow (brand-and-design.md §4.5).
export function Card({
  as: Tag = 'article',
  media,
  eyebrow,
  title,
  meta,
  headingLevel = 3,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      {...rest}
      className={cn(
        'flex flex-col overflow-hidden rounded-crisp border border-hairline bg-surface',
        className,
      )}
    >
      {media}
      {eyebrow || title || meta || children ? (
        <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-4">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          {title ? (
            <Heading level={headingLevel} size="md">
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
        'flex flex-col overflow-hidden rounded-crisp border border-hairline bg-surface',
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
