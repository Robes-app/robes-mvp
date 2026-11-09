import { COLOUR_FAMILIES } from '@robes/core/colour';
import { fonts, maxFontSizeMultiplier, useColor } from '@robes/ui-native';
import { Pressable, Text, View } from 'react-native';
import { FamilyTile } from '@/features/wardrobe/ColourField';

// The Front Door's COLOUR section (PRD rev 3 §7.1a): a five-column grid of the thirteen colour
// families, each a 40pt quartered swatch with its name beneath; picked = a 2pt cream gap inside a
// 1.5pt ink ring, the name in ink. Several at once. Twin of web components/filters/swatch-grid.tsx.
export function SwatchGrid({
  selected,
  onToggle,
}: {
  selected: readonly string[];
  onToggle: (family: string) => void;
}) {
  const ink = useColor('ink');
  return (
    <View className="flex-row flex-wrap">
      {COLOUR_FAMILIES.map((family) => {
        const on = selected.includes(family.id);
        return (
          <Pressable
            key={family.id}
            accessibilityRole="button"
            accessibilityLabel={family.name}
            accessibilityState={{ selected: on }}
            onPress={() => onToggle(family.id)}
            style={{ width: '20%', minHeight: 44 }}
            className="items-center gap-1.5 py-1.5"
            testID={`swatch-${family.id}`}
          >
            <View
              className="rounded-[11px] p-[2px]"
              style={{ borderWidth: 1.5, borderColor: on ? ink : 'transparent' }}
            >
              <FamilyTile family={family} size={40} />
            </View>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={maxFontSizeMultiplier.label}
              className={on ? 'text-ink' : 'text-ink-muted'}
              style={{ fontFamily: on ? fonts.sansMedium : fonts.sansRegular, fontSize: 11 }}
            >
              {family.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
