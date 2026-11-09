import type { Look } from '@robes/contracts';
import { Icon, type IconName } from '@robes/icons/web';
import { type Aspect, Card } from '@robes/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LookImage } from './look-image';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

export interface LookTileProps {
  look: Look;
  sizes: string;
  // The photograph's shape on this surface: 3:4 in the Lookbook grid and on a day (beta).
  aspect?: Aspect;
  // The whole tile opens the look, or answers a pick — never both.
  href?: string;
  onSelect?: () => void;
  selected?: boolean;
  disabled?: boolean;
  // What the tile says beside its name, per surface: LOOK 1 / Suggested / Draft, and the facts.
  eyebrow?: ReactNode;
  // Rose marks Robes' hand or something unfinished (Draft); the default is faint.
  eyebrowTone?: 'faint' | 'warm';
  // A small warm chip at the eyebrow's right: Worn ✓ on a day she wore it.
  badge?: string | null;
  meta?: ReactNode;
  // A glyph before the meta (the Lookbook card's calendar, PRD rev 3 §2.4) and a small mark at
  // the card's bottom right (the bag on a look with pieces to find), each named for a reader.
  metaIcon?: IconName;
  mark?: { icon: IconName; label: string } | null;
  // The look's first tag, a small chip between the name and the facts (Look redline 27 Oct).
  tag?: string | null;
  name?: string;
  italic?: boolean;
  label?: string;
  priority?: boolean;
  dashed?: boolean;
  dimmed?: boolean;
  // On the photograph (a diary door, a mark, the scan line) and in the corner (✕, ↻).
  onImage?: ReactNode;
  corner?: ReactNode;
  // The OOTD card on home (design 3k): the same frame on a 6px radius, the name in small caps
  // with a chevron, no eyebrow or meta — the day's look, not a catalogue card.
  // The look on home's day (Felix 3k): the photograph alone on the tile radius, no frame and no
  // words on it — its name stands under the discs; the whole photo opens it.
  variant?: 'card' | 'ootd';
  className?: string;
  testId?: string;
}

// ONE look card, every surface: the photograph and what the look is are held in one frame, so a
// look reads the same in the Lookbook, on a day, in a rail and in a picker. Give it an eyebrow
// and a meta line; never redraw the anatomy. Beta's card (native parity canvas): white on a
// hairline, a Cormorant name and a muted meta line — the native twin is
// mobile/src/features/looks/LookTile.tsx.
export function LookTile({
  look,
  sizes,
  aspect = '4:5',
  href,
  onSelect,
  selected = false,
  disabled = false,
  eyebrow,
  eyebrowTone = 'faint',
  badge,
  meta,
  metaIcon,
  mark,
  tag,
  name,
  italic = false,
  label,
  priority = false,
  dashed = false,
  dimmed = false,
  onImage,
  corner,
  variant = 'card',
  className,
  testId,
}: LookTileProps) {
  const title = name ?? look.name;
  const ootd = variant === 'ootd';
  // The whole card is the target: a stretched link (or button) behind the actions on top of it.
  const stretched = `${focus} rounded-soft after:absolute after:inset-0 after:rounded-soft`;
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
      edge={!ootd}
      className={[
        'min-w-0',
        // The dashed draft: unfinished, on the fine edge, its photograph inset in the frame.
        dashed ? 'border-dashed border-rule-mid bg-transparent p-1.5' : '',
        ootd ? 'rounded-tile bg-surface-sunk' : '',
        // A pick is warm, never black (root CLAUDE.md): the warm fill on the warm edge.
        selected ? 'border-selected-line bg-selected' : '',
        dimmed ? 'opacity-60' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      media={
        <>
          <div className={`relative ${dashed ? 'overflow-hidden rounded-[8px]' : ''}`}>
            <LookImage look={look} sizes={sizes} priority={priority} aspect={aspect} />
            {onImage}
          </div>
          {ootd ? (
            // The name is read, not shown: the stretched link covers the photograph.
            <h3 className="[&_span]:sr-only">{heading}</h3>
          ) : (
            <div
              className={`flex flex-col ${dashed ? 'gap-px px-1 pt-2 pb-1' : 'gap-0.5 px-3 pt-2.5 pb-3'}`}
            >
              {eyebrow || badge ? (
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p
                    className={`truncate font-sans font-normal uppercase tracking-[0.22em] ${
                      eyebrowTone === 'warm' ? 'text-accent-warm' : 'text-ink-faint'
                    } ${dashed ? 'text-[10px]' : 'text-[11px]'}`}
                  >
                    {eyebrow}
                  </p>
                  {badge ? (
                    <span className="shrink-0 rounded-pill border border-selected-line bg-selected px-2 py-px font-sans text-[10px] text-ink">
                      {badge}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <h3
                className={`truncate font-display font-light text-ink ${dashed ? 'text-lg leading-[22px]' : 'text-xl leading-[23px]'}`}
              >
                {heading}
              </h3>
              {tag ? (
                <span className="mt-1 mb-0.5 self-start rounded-pill border border-hairline bg-surface px-2 py-0.5 font-sans text-[10px] text-ink-muted">
                  {tag}
                </span>
              ) : null}
              {meta ? (
                <p className="flex min-w-0 items-center gap-1.5 font-sans text-[11px] text-ink-muted">
                  {metaIcon ? <Icon name={metaIcon} size={11} className="shrink-0" /> : null}
                  <span className="min-w-0 flex-1 truncate">{meta}</span>
                  {mark ? (
                    <Icon name={mark.icon} size={12} label={mark.label} className="shrink-0" />
                  ) : null}
                </p>
              ) : null}
            </div>
          )}
        </>
      }
      {...(corner
        ? {
            overlay: (
              <div className={`absolute z-10 ${ootd ? 'top-3 right-3' : 'top-1.5 right-1.5'}`}>
                {corner}
              </div>
            ),
          }
        : {})}
    />
  );
}
