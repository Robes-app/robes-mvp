'use client';

import type { Look } from '@robes/contracts';
import { lookbook as copy, filters } from '@robes/copy';
import { startedLabel } from '@robes/core/looks';
import { Icon, type IconName } from '@robes/icons/web';
import { type Aspect, TileSheet } from '@robes/ui';
import { useRef, useState } from 'react';
import { localToday } from '@/lib/dates';
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
      mark={look.proposals.length ? { icon: 'shop', label: copy.card.shop } : null}
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

// Held this long, a touch opens the card's menu (iOS's long press; a right click does too).
const LONG_PRESS_MS = 500;

// Suggested (design "Suggested looks", 23 Nov): a Lookbook card signed by Robes — the photograph,
// the name, Suggested by Robes, and nothing on the photograph. A click opens the look; a long press
// or a right click offers Save look · Delete look on a glass sheet, as iOS's preview menu does.
// Native twin: LookTiles.tsx SuggestedTile.
export function SuggestedTile({
  look,
  onSave,
  onDelete,
  aspect,
}: {
  look: Look;
  onSave: () => void;
  onDelete: () => void;
  aspect?: Aspect;
}) {
  const busy = scanningLine(look);
  const [menu, setMenu] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A long press opens the menu and swallows the click that ends it, so the look stays shut.
  const held = useRef(false);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const pick = (run: () => void) => () => {
    setMenu(false);
    run();
  };
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the press only adds a shortcut; the link and the look's own page carry every action
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        cancel();
        setMenu(true);
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch') return;
        held.current = false;
        timer.current = setTimeout(() => {
          held.current = true;
          setMenu(true);
        }, LONG_PRESS_MS);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onClickCapture={(e) => {
        if (!held.current) return;
        held.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
      className="h-full [-webkit-touch-callout:none]"
    >
      <LookTile
        look={look}
        href={`/look/${look.id}`}
        sizes="(min-width: 768px) 33vw, 50vw"
        {...(aspect ? { aspect } : {})}
        label={copy.suggestedTile.label(look.name)}
        signed={copy.suggestedTile.by}
        testId={`suggested-${look.id}`}
        onImage={busy ? <Scanning line={busy} /> : null}
      />
      <TileSheet
        open={menu}
        onOpenChange={setMenu}
        title={look.name}
        tiles={[
          {
            icon: 'bookmark',
            label: copy.suggestedTile.menu.save,
            onClick: pick(onSave),
            testId: 'suggested-menu-save',
          },
          {
            icon: 'trash',
            label: copy.suggestedTile.menu.delete,
            onClick: pick(onDelete),
            testId: 'suggested-menu-delete',
          },
        ]}
      />
    </div>
  );
}
