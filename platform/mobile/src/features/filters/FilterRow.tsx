import { filters as copy } from '@robes/copy';
import type { SeasonOption } from '@robes/core/filters';
import { FilterButton, Pill } from '@robes/ui-native';
import { ScrollView, View } from 'react-native';
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
  testID?: string;
}

// The Front Door's filter row (PRD rev 3 §2.5), one line that scrolls sideways and never wraps:
// Filter · the applied season chips · a rule · All and the quick chips. Twin of web
// components/filters/filter-row.tsx.
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
  testID,
}: FilterRowProps) {
  const none = active.length === 0;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      // The row bleeds to the sheet's edges so the last chip can scroll clear of them.
      className="-mx-5"
      contentContainerClassName="flex-row items-center gap-2 px-5"
      testID={testID}
    >
      <FilterButton count={sheetCount} onPress={onOpenSheet} testID="filter-button" />
      {seasons.map((season) => (
        <Pill
          key={season}
          size="sm"
          selected
          removable
          label={copy.removeSeason(copy.seasons[season])}
          onPress={() => onRemoveSeason(season)}
        >
          {copy.seasons[season]}
        </Pill>
      ))}
      <View className="h-4 w-px bg-rule-mid" />
      <Pill size="sm" tone="rose" selected={none} count={allCount} onPress={onAll}>
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
            onPress={() => onToggle(chip.value)}
          >
            {chip.label}
          </Pill>
        );
      })}
    </ScrollView>
  );
}
