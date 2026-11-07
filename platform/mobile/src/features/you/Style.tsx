import type { StyleProfile } from '@robes/contracts';
import { you } from '@robes/copy';
import { Eyebrow, Heading, Text } from '@robes/ui-native';
import { View } from 'react-native';

const copy = you.style;

// Swatch colours are her profile's data from the API, not design tokens.
function Swatches({
  label,
  swatches,
}: {
  label: string;
  swatches: { name: string; hex: string }[];
}) {
  return (
    <View className="gap-2">
      <Eyebrow>{label}</Eyebrow>
      <View className="flex-row flex-wrap gap-3">
        {swatches.map((s) => (
          <View key={s.name} className="items-center gap-1" style={{ width: 64 }}>
            <View
              accessibilityElementsHidden
              className="rounded-full border border-hairline"
              style={{ width: 36, height: 36, backgroundColor: s.hex }}
            />
            <Text size="caption" numberOfLines={2}>
              {s.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// The colour notes (4b): what the season wears, its neutrals, what to go easy on and its metals.
// Twin of web you/style/style-profile.tsx ColourResult.
export function ColourResult({ colour }: { colour: NonNullable<StyleProfile['colour']> }) {
  return (
    <View className="gap-4">
      <Heading size="md">{colour.season}</Heading>
      <Text>{colour.summary}</Text>
      <Text size="small" tone="muted">
        {colour.undertone_note}
      </Text>
      <Swatches label={copy.best} swatches={colour.best_colours} />
      <Swatches label={copy.neutrals} swatches={colour.neutrals} />
      <Swatches label={copy.avoid} swatches={colour.avoid_colours} />
      <Swatches
        label={copy.metals}
        swatches={colour.metals.map((m) => ({ name: m.name, hex: m.hexes[1] ?? m.hexes[0] ?? '' }))}
      />
    </View>
  );
}
