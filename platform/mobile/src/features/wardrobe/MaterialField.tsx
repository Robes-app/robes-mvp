import { wardrobe } from '@robes/copy';
import { DEFAULT_MATERIAL_FAMILY, familyOfMaterial, MATERIAL_FAMILIES } from '@robes/core/material';
import { MIN_TOUCH, Text } from '@robes/ui-native';
import { Pressable, View } from 'react-native';
import { FamilyList } from './ColourField';

const copy = wardrobe.material;

// The material families as a FamilyList (canvas 3b), the same list as the colours without the
// tiles: it opens on the family of what is filed (Natural when nothing is), a pick is the answer.
// "Not sure" sits under the card and is the warm one while nothing is filed.
// The web twin is app/src/components/wardrobe/material-field.tsx.
export function MaterialPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <View className="gap-4">
      <FamilyList
        initial={familyOfMaterial(value)?.id ?? DEFAULT_MATERIAL_FAMILY}
        itemRole="radio"
        groups={MATERIAL_FAMILIES.map((f) => ({
          id: f.id,
          name: f.name,
          items: f.materials.map((m) => ({
            id: m.id,
            name: m.name,
            hint: m.hint || null,
            selected: m.id === value,
            onPick: () => onChange(m.id),
          })),
        }))}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.notSure}
        accessibilityState={{ selected: value === null }}
        onPress={() => onChange(null)}
        style={{ minHeight: MIN_TOUCH }}
        className={`items-center justify-center rounded-pill border ${
          value === null ? 'border-selected-line bg-selected' : 'border-rule-mid bg-surface-raised'
        }`}
      >
        <Text size="small" tone="muted">
          {copy.notSure}
        </Text>
      </Pressable>
    </View>
  );
}
