'use client';

import type { Look } from '@robes/contracts';
import { lookbook as copy, filters } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { anchorName, startedLabel, suggestionReason } from '@robes/core/looks';
import { Icon, type IconName } from '@robes/icons/web';
import { type Aspect, Image } from '@robes/ui';
import Link from 'next/link';
import { localToday } from '@/lib/dates';
import { imageSources } from '@/lib/image';
import { LookTile } from './look-tile';
import { Scanning, scanningLine } from './scan-line';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// A control on the photograph: drawn small (32px ✕, 36px calendar — beta's size, not a large
// white disc) with the hit area reaching out to 44px. The native twin is LookTiles.tsx OnPhoto.
export function OnPhoto({
  icon,
  label,
  size,
  onClick,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  size: 32 | 36;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`relative z-10 flex shrink-0 items-center justify-center rounded-pill bg-bg text-ink after:absolute hover:bg-surface disabled:opacity-50 ${
        size === 32 ? 'size-8 after:-inset-1.5' : 'size-9 after:-inset-1'
      } ${focus}`}
    >
      <Icon name={icon} size={size === 32 ? 14 : 16} />
    </button>
  );
}

// The Lookbook card's line (Front Door PRD rev 3 §5.2): the wears or New, then its seasons, Year
// round when it carries none; a bag marks a look with pieces still to find. Twin of LookTiles.tsx.
export function cardMeta(look: Look): string {
  return copy.meta.frontDoor(
    look.timesWorn,
    look.seasons.map((s) => filters.seasons[s]),
    filters.seasons.year_round,
  );
}

// Why Robes suggested a look, as the card's line (PRD §5.3).
export function reasonLine(look: Look): string {
  const reason = suggestionReason(look);
  switch (reason.kind) {
    case 'anchor':
      return copy.suggestedTile.around(reason.piece);
    case 'day':
      return copy.suggestedTile.reason.day(weekdayLong(reason.date));
    case 'wishlist':
      return copy.suggestedTile.reason.wishlist;
    case 'own':
      return copy.suggestedTile.reason.own(reason.pieces);
    case 'wearMost':
      return copy.suggestedTile.reason.wearMost;
    default:
      return copy.suggestedTile.fromPrompt;
  }
}

// Saved: no eyebrow (the default state needs no label). The calendar sits ON the image bottom
// left — the look's own diary door, so a day is set without leaving the grid (legacy 13 Oct, it
// replaced the card's Wear pill) — and ✕ deletes, top right, as on a suggestion.
export function SavedTile({
  look,
  priority = false,
  aspect,
  onDiary,
  onDelete,
}: {
  look: Look;
  priority?: boolean;
  aspect?: Aspect;
  onDiary?: () => void;
  onDelete?: () => void;
}) {
  return (
    <LookTile
      look={look}
      href={`/look/${look.id}`}
      sizes="(min-width: 768px) 33vw, 50vw"
      priority={priority}
      {...(aspect ? { aspect } : {})}
      metaIcon="calendar"
      meta={cardMeta(look)}
      mark={look.proposals.length ? { icon: 'bag', label: copy.card.shop } : null}
      onImage={
        onDiary ? (
          <div className="absolute bottom-2 left-2">
            <OnPhoto icon="plan" label={copy.card.diary} size={36} onClick={onDiary} />
          </div>
        ) : null
      }
      corner={
        onDelete ? (
          // Beta's ✕ waits for the pointer on a device that has one; a phone always shows it.
          <span className="block transition-opacity [@media(hover:hover)]:opacity-0 [article:focus-within_&]:opacity-100 [article:hover_&]:opacity-100">
            <OnPhoto icon="close" label={copy.card.delete} size={32} onClick={onDelete} />
          </span>
        ) : undefined
      }
    />
  );
}

// Draft: the same tile, dashed and small — a look, unfinished, in the In progress row.
export function DraftTile({ look }: { look: Look }) {
  const name = look.nameProvisional ? copy.draftTile.untitled : look.name;
  return (
    <LookTile
      look={look}
      href={`/looks/draft/${look.id}`}
      sizes="140px"
      dashed
      // Beta's In progress tile is 140 wide (Header Audit Round 2).
      className="w-[140px] shrink-0"
      eyebrow={copy.draftTile.eyebrow}
      eyebrowTone="warm"
      name={name}
      italic={look.nameProvisional}
      label={`${copy.draftTile.eyebrow}: ${name}`}
      meta={copy.draftTile.meta(startedLabel(look.createdAt, localToday()))}
      testId={`draft-${look.id}`}
    />
  );
}

// Bottom left of a suggestion says where it came from (legacy _lkSuggCard): the piece it was
// styled around — its photograph, or its initial — and a click opens the piece; a look styled
// from her own words wears a rose open-quote instead. The native twin is SuggestedMark.
function SuggestedMark({ look }: { look: Look }) {
  const anchor = look.anchor;
  const frame =
    'absolute bottom-2 left-2 z-10 flex h-11 w-9 items-center justify-center overflow-hidden rounded-crisp border-2 border-bg bg-surface';
  if (!anchor) {
    return (
      <span aria-hidden data-testid={`suggested-${look.id}-quote`} className={frame}>
        <span className="font-display text-[26px] leading-[30px] text-accent-inspire">
          {copy.suggestedTile.quote}
        </span>
      </span>
    );
  }
  const name = anchorName(anchor.label, anchor.brand);
  const mark = anchor.image ? imageSources(anchor.image.renditions) : null;
  return (
    <Link
      href={`/piece/${anchor.id}`}
      aria-label={copy.suggestedTile.yourPiece(name)}
      data-testid={`suggested-${look.id}-mark`}
      className={`${frame} ${focus}`}
    >
      {mark ? (
        <Image src={mark.src} srcSet={mark.srcSet} sizes="36px" alt="" aspect="4:5" />
      ) : (
        <span className="font-display text-lg text-ink">{name.charAt(0).toLocaleUpperCase()}</span>
      )}
    </Link>
  );
}

// Suggested: Robes' frame, why it was suggested under the name, where it came from in the corner,
// the bookmark that saves it on the photograph (PRD §5.3), ✕ and ↻ always shown.
export function SuggestedTile({
  look,
  onRemove,
  onSwap,
  onSave,
  saving = false,
  swapping,
  showMark = true,
  aspect,
}: {
  look: Look;
  onRemove: () => void;
  onSwap: () => void;
  onSave?: () => void;
  saving?: boolean;
  swapping: boolean;
  showMark?: boolean;
  aspect?: Aspect;
}) {
  const busy = scanningLine(look, swapping);
  return (
    <LookTile
      look={look}
      href={`/look/${look.id}`}
      sizes="(min-width: 768px) 33vw, 50vw"
      {...(aspect ? { aspect } : {})}
      eyebrow={copy.suggestedTile.eyebrow}
      eyebrowTone="warm"
      meta={reasonLine(look)}
      mark={look.proposals.length ? { icon: 'bag', label: copy.card.shop } : null}
      testId={`suggested-${look.id}`}
      onImage={
        <>
          {showMark ? <SuggestedMark look={look} /> : null}
          {busy ? <Scanning line={busy} /> : null}
          {onSave ? (
            <div className="absolute right-2 bottom-2">
              <OnPhoto
                icon="bookmark"
                label={copy.suggestedTile.save(look.name)}
                size={32}
                onClick={onSave}
                disabled={saving}
              />
            </div>
          ) : null}
        </>
      }
      corner={
        <div className="flex gap-1.5">
          {/* Beta's order: ↻ then ✕, the way out at the edge. */}
          <OnPhoto
            icon="swap"
            label={copy.suggestedTile.swap(look.name)}
            size={32}
            onClick={onSwap}
            disabled={swapping}
          />
          <OnPhoto
            icon="close"
            label={copy.suggestedTile.remove(look.name)}
            size={32}
            onClick={onRemove}
          />
        </div>
      }
    />
  );
}
