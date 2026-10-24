import { wardrobe } from '@robes/copy';
import { DEFAULT_MATERIAL_FAMILY, familyOfMaterial, MATERIAL_FAMILIES } from '@robes/core/material';
import { Icon } from '@robes/icons/native';
import { Pill, Text, useColor } from '@robes/ui-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

const copy = wardrobe.material;

// Built like the colour picker (ColourField.tsx): the families as one scrolling row of chips, a
// hairline, then the family's materials as a list she picks one from. It opens on the family of
// what is filed (Natural when nothing is). A pick is the answer; "Not sure" files nothing.
// The web twin is app/src/components/wardrobe/material-field.tsx.
export function MaterialPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const ink = useColor('ink');
  const home = familyOfMaterial(value)?.id ?? null;
  const [family, setFamily] = useState(home ?? DEFAULT_MATERIAL_FAMILY);
  const fam = MATERIAL_FAMILIES.find((f) => f.id === family);
  return (
    <View className="gap-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={copy.families}
        contentContainerClassName="gap-2 pb-1"
      >
        {MATERIAL_FAMILIES.map((f) => (
          <View key={f.id} className="flex-row items-center">
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
        {fam?.materials.map((m) => {
          const on = m.id === value;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="radio"
              accessibilityLabel={m.name}
              accessibilityState={{ checked: on }}
              onPress={() => onChange(m.id)}
              className={`min-h-11 flex-row items-center gap-3 rounded-crisp border px-3 py-2 ${
                on ? 'border-selected-line bg-selected' : 'border-transparent'
              }`}
            >
              <View className="flex-1">
                <Text size="small">{m.name}</Text>
                {m.hint ? (
                  <Text size="caption" tone="muted">
                    {m.hint}
                  </Text>
                ) : null}
              </View>
              {on ? <Icon name="check" size={18} color={ink} /> : null}
            </Pressable>
          );
        })}
      </View>
      {value ? (
        <View className="items-center">
          <Pill onPress={() => onChange(null)}>{copy.notSure}</Pill>
        </View>
      ) : null}
    </View>
  );
}
