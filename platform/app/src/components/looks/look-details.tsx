'use client';

import type { Look } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { dayMonth } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { DrillList, DrillRow } from '@robes/ui';
import { useEffect, useRef, useState } from 'react';

const copy = lookbook.savedLook.details;
const seasonNames = lookbook.savedLook.seasonsView.names;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:-outline-offset-2 focus-visible:outline-focus-ring';

// The summary each row shows, built from the same words on both platforms.
export function detailSummaries(look: Look): {
  tags: string | null;
  seasons: string | null;
  worn: string | null;
} {
  const last = look.timesWorn && look.lastWornOn ? dayMonth(look.lastWornOn) : null;
  return {
    tags: look.tags.length ? look.tags.join(' · ') : null,
    seasons: look.seasons.length ? look.seasons.map((s) => seasonNames[s]).join(' · ') : null,
    worn: look.timesWorn ? copy.wornSummary(look.timesWorn, last) : null,
  };
}

// Felix's LookDetails (3e Details): Tags, Seasons, Worn and Caption as one drill-down card — the
// shared DrillList, with SettingsView. The caption edits inline on a `warm-line` underline; Enter
// or blur keeps it. Native twin: mobile/src/features/looks/LookDetails.tsx.
export function LookDetails({
  look,
  onTags,
  onSeasons,
  onWorn,
  onCaption,
}: {
  look: Look;
  onTags: () => void;
  onSeasons: () => void;
  // A draft has no Worn row (D14): leave it out.
  onWorn?: () => void;
  // The Caption is the look's name (D16): empty or unchanged keeps the name it had.
  onCaption: (name: string) => void;
}) {
  const summary = detailSummaries(look);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(look.name);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) field.current?.focus();
  }, [editing]);
  const keep = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== look.name) onCaption(next);
  };
  return (
    <DrillList testId="look-details">
      <DrillRow
        label={copy.tags}
        value={summary.tags ?? copy.none}
        muted={!summary.tags}
        onClick={onTags}
        testId="details-tags"
      />
      <DrillRow
        label={copy.seasons}
        value={
          look.seasons.length ? (
            <span className="flex items-center gap-1.5">
              {look.seasons.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <Icon name={s} size={12} />
                  {look.seasons.length > 2 ? null : seasonNames[s]}
                </span>
              ))}
            </span>
          ) : (
            copy.yearRound
          )
        }
        muted={!look.seasons.length}
        onClick={onSeasons}
        testId="details-seasons"
      />
      {onWorn ? (
        <DrillRow
          label={copy.worn}
          value={summary.worn ?? copy.notWorn}
          muted
          onClick={onWorn}
          testId="details-worn"
        />
      ) : null}
      {editing ? (
        <div className="flex h-12 items-center gap-3 py-[7px] pr-[7px] pl-4">
          <span className="type-label shrink-0 text-ink-muted">{copy.caption}</span>
          <input
            ref={field}
            aria-label={copy.caption}
            value={draft}
            placeholder={copy.captionPlaceholder}
            maxLength={120}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={keep}
            onKeyDown={(e) => {
              if (e.key === 'Enter') keep();
              if (e.key === 'Escape') {
                setDraft(look.name);
                setEditing(false);
              }
            }}
            className="h-[26px] min-w-0 flex-1 bg-transparent pb-px text-right font-sans text-[11px] text-ink shadow-[inset_0_-0.5px_0_var(--color-selected-line)] outline-none placeholder:font-display placeholder:font-light placeholder:text-[15px] placeholder:text-ink-faint placeholder:italic"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setDraft('')}
            disabled={!draft}
            aria-label={copy.clearCaption}
            className={`-mx-1 flex size-8 items-center justify-center rounded-pill text-ink-muted disabled:opacity-35 ${focus}`}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ) : (
        <DrillRow
          label={copy.caption}
          value={look.name}
          onClick={() => {
            setDraft(look.name);
            setEditing(true);
          }}
          ariaLabel={copy.editCaption}
          testId="details-caption"
          trailing={
            <span className="-mx-1 flex size-8 shrink-0 items-center justify-center rounded-pill text-ink">
              <Icon name="pencil" size={14} />
            </span>
          }
        />
      )}
    </DrillList>
  );
}
