'use client';

import type { Look } from '@robes/contracts';
import { lookbook as copy, looks } from '@robes/copy';
import { anchorName, startedLabel } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { IconButton, Image, Text } from '@robes/ui';
import Link from 'next/link';
import { localToday } from '@/lib/dates';
import { imageSources } from '@/lib/image';
import { LookImage } from './look-image';
import { Scanning, scanningLine } from './scan-line';

const tile =
  'block rounded-crisp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Saved: no eyebrow (the default state needs no label). The calendar sits ON the image bottom
// left — the look's own diary door, so a day is set without leaving the grid (legacy 13 Oct, it
// replaced the card's Wear pill) — and ✕ deletes, top right, as on a suggestion. The card's link
// is stretched behind both, so the actions are never nested inside it.
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
  const around = look.anchor ? anchorName(look.anchor.label, look.anchor.brand) : '';
  return (
    <article className="relative flex flex-col overflow-hidden rounded-soft border border-hairline bg-surface">
      <div className="relative">
        <LookImage look={look} priority={priority} sizes="(min-width: 768px) 33vw, 50vw" />
        {onDiary ? (
          <button
            type="button"
            onClick={onDiary}
            aria-label={copy.card.diary}
            title={copy.card.diary}
            className="absolute bottom-2.5 left-2.5 z-10 flex size-9 items-center justify-center rounded-pill bg-bg text-ink shadow-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
          >
            <Icon name="plan" size={16} />
          </button>
        ) : null}
        {onDelete ? (
          <div className="absolute top-2 right-2 z-10">
            <IconButton icon="close" label={copy.card.delete} onClick={onDelete} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 px-3 pt-2.5 pb-3">
        <Link
          href={`/look/${look.id}`}
          className={`${tile} after:absolute after:inset-0`}
          aria-label={look.name}
        >
          <Text className="truncate font-display text-xl">{look.name}</Text>
        </Link>
        <Text size="caption" tone="faint" className="truncate">
          {around
            ? `${looks.savedList.worn(look.timesWorn)} · ${copy.meta.around(around)}`
            : look.timesWorn
              ? looks.savedList.worn(look.timesWorn)
              : copy.meta.notYetWorn}
        </Text>
      </div>
    </article>
  );
}

// Draft: the same tile, dashed — a look, unfinished.
export function DraftTile({ look }: { look: Look }) {
  const name = look.nameProvisional ? copy.draftTile.untitled : look.name;
  return (
    <Link
      href={`/look/${look.id}`}
      aria-label={`${copy.draftTile.eyebrow}: ${name}`}
      className={`${tile} w-44 shrink-0`}
      data-testid={`draft-${look.id}`}
    >
      <article className="flex flex-col gap-1 rounded-soft border-[1.5px] border-dashed border-border-control bg-surface p-1.5">
        <LookImage look={look} sizes="176px" />
        <Text size="caption" tone="muted" className="uppercase tracking-wider">
          {copy.draftTile.eyebrow}
        </Text>
        <Text size="small" italic={look.nameProvisional} className="truncate">
          {name}
        </Text>
        <Text size="caption" tone="muted" className="truncate">
          {copy.draftTile.meta(startedLabel(look.createdAt, localToday()))}
        </Text>
      </article>
    </Link>
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
    <article
      className="relative flex flex-col overflow-hidden rounded-soft border border-hairline bg-surface"
      data-testid={`suggested-${look.id}`}
    >
      <Link href={`/look/${look.id}`} aria-label={look.name} className={tile}>
        <div className="relative overflow-hidden">
          <LookImage look={look} sizes="(min-width: 768px) 33vw, 50vw" />
          {showMark && mark ? (
            <div className="absolute bottom-2 left-2 w-9 overflow-hidden rounded-crisp border border-hairline bg-bg">
              <Image src={mark.src} srcSet={mark.srcSet} sizes="36px" alt="" aspect="4:5" />
            </div>
          ) : null}
          {busy ? <Scanning line={busy} /> : null}
        </div>
        <div className="flex flex-col gap-1 px-3 pt-2.5 pb-3">
          <Text size="caption" tone="muted" className="uppercase tracking-wider">
            {copy.suggestedTile.eyebrow}
          </Text>
          <Text className="truncate font-display text-xl">{look.name}</Text>
          <Text size="caption" tone="faint" className="truncate">
            {around ? copy.suggestedTile.around(around) : copy.suggestedTile.fromPrompt}
          </Text>
        </div>
      </Link>
      <div className="absolute top-1 right-1 flex rounded-pill bg-bg/80">
        <IconButton icon="close" label={copy.suggestedTile.remove(look.name)} onClick={onRemove} />
        <IconButton
          icon="swap"
          label={copy.suggestedTile.swap(look.name)}
          onClick={onSwap}
          disabled={swapping}
        />
      </div>
    </article>
  );
}
