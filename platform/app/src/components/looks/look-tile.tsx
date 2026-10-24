import type { Look } from '@robes/contracts';
import { Card } from '@robes/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LookImage } from './look-image';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

export interface LookTileProps {
  look: Look;
  sizes: string;
  // The whole tile opens the look, or answers a pick — never both.
  href?: string;
  onSelect?: () => void;
  selected?: boolean;
  disabled?: boolean;
  // What the tile says beside its name, per surface: LOOK 1 / Suggested / Draft, and the facts.
  eyebrow?: ReactNode;
  meta?: ReactNode;
  name?: string;
  italic?: boolean;
  label?: string;
  priority?: boolean;
  dashed?: boolean;
  dimmed?: boolean;
  // On the photograph (a diary door, a mark, the scan line) and in the corner (✕, ↻).
  onImage?: ReactNode;
  corner?: ReactNode;
  className?: string;
  testId?: string;
}

// ONE look card, every surface: the photograph and what the look is are held in one frame, so a
// look reads the same in the Lookbook, on a day, in a rail and in a picker. Give it an eyebrow
// and a meta line; never redraw the anatomy.
export function LookTile({
  look,
  sizes,
  href,
  onSelect,
  selected = false,
  disabled = false,
  eyebrow,
  meta,
  name,
  italic = false,
  label,
  priority = false,
  dashed = false,
  dimmed = false,
  onImage,
  corner,
  className,
  testId,
}: LookTileProps) {
  const title = name ?? look.name;
  // The whole card is the target: a stretched link (or button) behind the actions on top of it.
  const stretched = `${focus} rounded-crisp after:absolute after:inset-0 after:rounded-crisp`;
  const heading = href ? (
    <Link href={href} aria-label={label ?? title} className={stretched}>
      <span className={italic ? 'italic' : undefined}>{title}</span>
    </Link>
  ) : onSelect ? (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label ?? title}
      className={`${stretched} block w-full text-left`}
    >
      <span className={italic ? 'italic' : undefined}>{title}</span>
    </button>
  ) : (
    <span className={italic ? 'italic' : undefined}>{title}</span>
  );

  return (
    <Card
      as="article"
      data-testid={testId}
      className={[
        'min-w-0',
        dashed ? 'border-[1.5px] border-dashed border-border-control' : '',
        selected ? 'border-ink' : '',
        dimmed ? 'opacity-60' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      media={
        <div className="relative">
          <LookImage look={look} sizes={sizes} priority={priority} />
          {onImage}
        </div>
      }
      {...(eyebrow ? { eyebrow } : {})}
      title={<span className="block truncate">{heading}</span>}
      titleSize="sm"
      {...(meta ? { meta: <span className="block truncate">{meta}</span> } : {})}
      {...(corner ? { overlay: <div className="absolute top-2 right-2 z-10">{corner}</div> } : {})}
    />
  );
}
