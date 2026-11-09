import { ui } from '@robes/copy';
import { Button, GlassSheet, Pill, Text, typeStyle } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { FilterOption } from './use-look-filters';

export interface PillSection {
  key: string;
  // The eyebrow over the section, authored in sentence case.
  title: string;
  options: readonly FilterOption[];
  // Looks show a live count after each option; the wardrobe's options show none.
  counts?: boolean;
  selected: readonly string[];
  onToggle: (value: string) => void;
}

// A section drawn by its caller under the shared eyebrow: the wardrobe's colour swatches and its
// brand select (PRD rev 3 §7.1a).
export interface CustomSection {
  key: string;
  title: string;
  custom: ReactNode;
}

export type FilterSection = PillSection | CustomSection;

export interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  sections: readonly FilterSection[];
  // Clear resets the sheet's facets; faint while nothing is picked.
  onClear: () => void;
  clearable: boolean;
  // SHOW n LOOKS / NO LOOKS MATCH: the one filled button, a confirmation (filters apply live).
  cta: string;
  ctaDisabled?: boolean;
  testID?: string;
}

// The Front Door's filter sheet (PRD rev 3 §2.5): a glass sheet with Clear at the right, a
// section per facet (an eyebrow and a wrap of option pills, ink when picked, their counts
// faceted), and the one button at the foot. Every section is multi-select: values OR within a
// section, AND across. Twin of web components/filters/filter-sheet.tsx.
export function FilterSheet({
  open,
  onClose,
  sections,
  onClear,
  clearable,
  cta,
  ctaDisabled = false,
  testID,
}: FilterSheetProps) {
  return (
    <GlassSheet
      open={open}
      onClose={onClose}
      title={ui.filter}
      action={{ label: ui.clear, onPress: onClear, disabled: !clearable, testID: 'filter-clear' }}
      testID={testID}
    >
      <View className="gap-5">
        {sections.map((section) => (
          <View key={section.key} className="gap-2.5">
            <Text className="text-ink-faint" style={typeStyle('label')}>
              {section.title}
            </Text>
            {'custom' in section ? (
              section.custom
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {section.options.map((option) => {
                  const on = section.selected.some(
                    (v) => v.toLowerCase() === option.value.toLowerCase(),
                  );
                  return (
                    <Pill
                      key={option.value}
                      tone="ink"
                      selected={on}
                      {...(section.counts === false ? {} : { count: option.count })}
                      onPress={() => section.onToggle(option.value)}
                      testID={`filter-${section.key}-${option.value}`}
                    >
                      {option.label}
                    </Pill>
                  );
                })}
              </View>
            )}
          </View>
        ))}
        <Button onPress={onClose} disabled={ctaDisabled} testID="filter-cta">
          {cta}
        </Button>
      </View>
    </GlassSheet>
  );
}
