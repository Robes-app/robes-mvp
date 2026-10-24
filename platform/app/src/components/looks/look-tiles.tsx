'use client';

import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { anchorName, lookFacts, startedLabel } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { IconButton, Image } from '@robes/ui';
import { localToday } from '@/lib/dates';
import { imageSources } from '@/lib/image';
import { LookTile } from './look-tile';
import { Scanning, scanningLine } from './scan-line';

// Saved: no eyebrow (the default state needs no label). The calendar sits ON the image bottom
// left — the look's own diary door, so a day is set without leaving the grid (legacy 13 Oct, it
// replaced the card's Wear pill) — and ✕ deletes, top right, as on a suggestion.
export function SavedTile({
  look,
  priority = false,
  onDiary,
  onDelete,
}: {
  look: Look;
  priority?: boolean;
  onDiary?: () => void;
  onDelete?: () => void;
}) {
  return (
    <LookTile
      look={look}
      href={`/look/${look.id}`}
      sizes="(min-width: 768px) 33vw, 50vw"
      priority={priority}
      meta={copy.meta.card(lookFacts(look, look.pieces.length))}
      onImage={
        onDiary ? (
          <button
            type="button"
            onClick={onDiary}
            aria-label={copy.card.diary}
            title={copy.card.diary}
            className="absolute bottom-2.5 left-2.5 z-10 flex size-9 items-center justify-center rounded-pill bg-bg text-ink shadow-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <Icon name="plan" size={16} />
          </button>
        ) : null
      }
      corner={
        onDelete ? (
          <IconButton icon="close" label={copy.card.delete} onClick={onDelete} />
        ) : undefined
      }
    />
  );
}

// Draft: the same tile, dashed — a look, unfinished.
export function DraftTile({ look }: { look: Look }) {
  const name = look.nameProvisional ? copy.draftTile.untitled : look.name;
  return (
    <LookTile
      look={look}
      href={`/look/${look.id}`}
      sizes="176px"
      dashed
      className="w-44 shrink-0"
      eyebrow={copy.draftTile.eyebrow}
      name={name}
      italic={look.nameProvisional}
      label={`${copy.draftTile.eyebrow}: ${name}`}
      meta={copy.draftTile.meta(startedLabel(look.createdAt, localToday()))}
      testId={`draft-${look.id}`}
    />
  );
}

// Suggested: Robes' frame, the piece it was styled around in the corner, ✕ and ↻ always shown.
export function SuggestedTile({
  look,
  onRemove,
  onSwap,
  swapping,
  showMark = true,
}: {
  look: Look;
  onRemove: () => void;
  onSwap: () => void;
  swapping: boolean;
  showMark?: boolean;
}) {
  const around = look.anchor ? anchorName(look.anchor.label, look.anchor.brand) : '';
  const mark = look.anchor?.image ? imageSources(look.anchor.image.renditions) : null;
  const busy = scanningLine(look, swapping);
  return (
    <LookTile
      look={look}
      href={`/look/${look.id}`}
      sizes="(min-width: 768px) 33vw, 50vw"
      eyebrow={copy.suggestedTile.eyebrow}
      meta={around ? copy.suggestedTile.around(around) : copy.suggestedTile.fromPrompt}
      testId={`suggested-${look.id}`}
      onImage={
        <>
          {showMark && mark ? (
            <div className="absolute bottom-2 left-2 w-9 overflow-hidden rounded-crisp border border-hairline bg-bg">
              <Image src={mark.src} srcSet={mark.srcSet} sizes="36px" alt="" aspect="4:5" />
            </div>
          ) : null}
          {busy ? <Scanning line={busy} /> : null}
        </>
      }
      corner={
        <div className="flex rounded-pill bg-bg/80">
          <IconButton
            icon="close"
            label={copy.suggestedTile.remove(look.name)}
            onClick={onRemove}
          />
          <IconButton
            icon="swap"
            label={copy.suggestedTile.swap(look.name)}
            onClick={onSwap}
            disabled={swapping}
          />
        </div>
      }
    />
  );
}
