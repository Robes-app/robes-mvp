'use client';

import { filters as copy } from '@robes/copy';
import type { SeasonOption } from '@robes/core/filters';
import { FilterButton, Pill } from '@robes/ui';
import type { FilterOption } from './use-look-filters';

export interface FilterRowProps {
  // How many sheet-only filters are on; the Filter button fills ink past 0.
  sheetCount: number;
  onOpenSheet: () => void;
  // The seasons picked in the sheet, each a chip with its × in the row.
  seasons: readonly SeasonOption[];
  onRemoveSeason: (season: SeasonOption) => void;
  // The quick chips after All, with live counts; a chip at 0 (and not active) is disabled.
  quick: readonly FilterOption[];
  active: readonly string[];
  onToggle: (value: string) => void;
  allCount: number;
  onAll: () => void;
  // Names the row for a reader ("Filter your looks").
  label: string;
  className?: string;
}

// The Front Door's filter row (PRD rev 3 §2.5), one line that scrolls sideways and never wraps:
// Filter · the applied season chips · a rule · All and the quick chips. Twin of native
// features/filters/FilterRow.tsx.
export function FilterRow({
  sheetCount,
  onOpenSheet,
  seasons,
  onRemoveSeason,
  quick,
  active,
  onToggle,
  allCount,
  onAll,
  label,
  className,
}: FilterRowProps) {
  const none = active.length === 0;
  return (
    <fieldset
      // The row bleeds to the sheet's edges so the last chip can scroll clear of them.
      className={`-mx-5 flex min-w-0 items-center gap-2 overflow-x-auto px-5 [scrollbar-width:none] ${className ?? ''}`}
    >
      <legend className="sr-only">{label}</legend>
      <FilterButton count={sheetCount} onClick={onOpenSheet} className="shrink-0" />
      {seasons.map((season) => (
        <Pill
          key={season}
          size="sm"
          selected
          removable
          aria-label={copy.removeSeason(copy.seasons[season])}
          onClick={() => onRemoveSeason(season)}
          className="shrink-0"
        >
          {copy.seasons[season]}
        </Pill>
      ))}
      <span aria-hidden className="h-4 w-px shrink-0 bg-rule-mid" />
      <Pill
        size="sm"
        tone="rose"
        selected={none}
        count={allCount}
        onClick={onAll}
        className="shrink-0"
      >
        {copy.all}
      </Pill>
      {quick.map((chip) => {
        const on = active.some((a) => a.toLowerCase() === chip.value.toLowerCase());
        return (
          <Pill
            key={chip.value}
            size="sm"
            tone="rose"
            selected={on}
            count={chip.count}
            disabled={!on && chip.count === 0}
            onClick={() => onToggle(chip.value)}
            className="shrink-0"
          >
            {chip.label}
          </Pill>
        );
      })}
    </fieldset>
  );
}
