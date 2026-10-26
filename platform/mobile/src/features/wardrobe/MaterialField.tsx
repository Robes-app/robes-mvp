import { wardrobe } from '@robes/copy';
import { DEFAULT_MATERIAL_FAMILY, familyOfMaterial, MATERIAL_FAMILIES } from '@robes/core/material';
import { MIN_TOUCH, Pill, Text } from '@robes/ui-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { OptionRow, useScrollToChosen } from './ColourField';

const copy = wardrobe.material;

// Built like the colour picker (ColourField.tsx): the families as one scrolling row of chips, a
// hairline, then the family's materials as a list she picks one from. It opens on the family of
// what is filed (Natural when nothing is), scrolled to it 24pt in; the chosen chip and row are warm
// with a check (redline 10). A pick is the answer; "Not sure" files nothing.
// The web twin is app/src/components/wardrobe/material-field.tsx.
export function MaterialPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const home = familyOfMaterial(value)?.id ?? null;
  const [family, setFamily] = useState(home ?? DEFAULT_MATERIAL_FAMILY);
  const { ref, onChosenLayout } = useScrollToChosen();
  const fam = MATERIAL_FAMILIES.find((f) => f.id === family);
  return (
    <View className="gap-4">
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={copy.families}
        contentContainerClassName="gap-2 pb-1"
      >
        {MATERIAL_FAMILIES.map((f) => (
          <View
            key={f.id}
            className="flex-row items-center"
            {...(f.id === family ? { onLayout: onChosenLayout } : {})}
          >
            <Pill selected={f.id === family} onPress={() => setFamily(f.id)}>
              {f.name}
            </Pill>
            {/* Where her material lives, while she is looking at another family. */}
            {f.id === home && f.id !== family ? (
              <View
                testID={`material-home-${f.id}`}
                className="ml-1 size-1.5 rounded-full bg-ink"
              />
            ) : null}
          </View>
        ))}
      </ScrollView>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={fam?.name}
        className="border-hairline border-t pt-2"
      >
        {fam?.materials.map((m) => (
          <OptionRow
            key={m.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: m.id === value }}
            selected={m.id === value}
            label={m.name}
            hint={m.hint || null}
            onPress={() => onChange(m.id)}
          />
        ))}
      </View>
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.notSure}
          onPress={() => onChange(null)}
          style={{ minHeight: MIN_TOUCH }}
          className="items-center justify-center rounded-pill border border-rule-mid bg-surface-raised"
        >
          <Text size="small" tone="muted">
            {copy.notSure}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
