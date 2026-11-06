'use client';

import type { Look } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { dayMonth } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { type ReactNode, useEffect, useRef, useState } from 'react';

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

// One drill row: a 9px tracked label, the summary (faint when empty), a 14px chevron.
function Row({
  label,
  summary,
  empty,
  muted = false,
  onOpen,
  children,
  testId,
}: {
  label: string;
  summary: string | null;
  empty: string;
  muted?: boolean;
  onOpen: () => void;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={testId}
      className={`flex h-12 w-full items-center gap-3 pr-3 pl-4 text-left ${focus}`}
    >
      <span className="type-label shrink-0 text-ink-muted">{label}</span>
      <span
        className={`flex min-w-0 flex-1 items-center justify-end gap-3 truncate font-sans text-[11px] ${summary && !muted ? 'text-ink-muted' : 'text-ink-faint'}`}
      >
        {children ?? summary ?? empty}
      </span>
      <Icon name="forward" size={14} className="shrink-0 text-ink-faint" />
    </button>
  );
}

// Felix's LookDetails (3e Details): Tags, Seasons, Worn and Caption as one drill-down card on
// `white` with a 0.5px `rule-mid` edge and 48px rows. The caption edits inline on a `warm-line`
// underline; Enter or blur keeps it. Native twin: mobile/src/features/looks/LookDetails.tsx.
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
  onCaption: (caption: string | null) => void;
}) {
  const summary = detailSummaries(look);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(look.note ?? '');
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) field.current?.focus();
  }, [editing]);
  const keep = () => {
    setEditing(false);
    const next = draft.trim() || null;
    if (next !== (look.note ?? null)) onCaption(next);
  };
  return (
    <div
      data-testid="look-details"
      className="divide-y divide-hairline overflow-hidden rounded-soft border-[0.5px] border-rule-mid bg-surface-raised"
    >
      <Row
        label={copy.tags}
        summary={summary.tags}
        empty={copy.none}
        onOpen={onTags}
        testId="details-tags"
      />
      <Row
        label={copy.seasons}
        summary={summary.seasons}
        empty={copy.yearRound}
        onOpen={onSeasons}
        testId="details-seasons"
      >
        {look.seasons.length ? (
          <span className="flex items-center gap-1.5">
            {look.seasons.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <Icon name={s} size={12} />
                {look.seasons.length > 2 ? null : seasonNames[s]}
              </span>
            ))}
          </span>
        ) : null}
      </Row>
      {onWorn ? (
        <Row
          label={copy.worn}
          summary={summary.worn}
          empty={copy.notWorn}
          muted
          onOpen={onWorn}
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
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={keep}
            onKeyDown={(e) => {
              if (e.key === 'Enter') keep();
              if (e.key === 'Escape') {
                setDraft(look.note ?? '');
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
        <button
          type="button"
          onClick={() => {
            setDraft(look.note ?? '');
            setEditing(true);
          }}
          aria-label={copy.editCaption}
          data-testid="details-caption"
          className={`flex h-12 w-full items-center gap-3 pr-3 pl-4 text-left ${focus}`}
        >
          <span className="type-label shrink-0 text-ink-muted">{copy.caption}</span>
          <span
            className={`min-w-0 flex-1 truncate text-right font-sans text-[11px] ${look.note ? 'text-ink-muted' : 'text-ink-faint'}`}
          >
            {look.note ?? copy.captionPlaceholder}
          </span>
          <span className="-mx-1 flex size-8 shrink-0 items-center justify-center rounded-pill text-ink">
            <Icon name="pencil" size={14} />
          </span>
        </button>
      )}
    </div>
  );
}
