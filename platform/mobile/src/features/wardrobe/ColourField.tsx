import { wardrobe } from '@robes/copy';
import {
  COLOUR_FAMILIES,
  PATTERNS,
  type PieceColour,
  pattern,
  pickShade,
  type Shade,
  shade,
} from '@robes/core/colour';
import { Icon } from '@robes/icons/native';
import { Text, useColor } from '@robes/ui-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

const copy = wardrobe.colour;

// Swatch colours are the colour model's data (a metallic draws its base hex here), not tokens.
export function ShadeSwatch({ shade: s, size = 22 }: { shade: Shade | null; size?: number }) {
  return (
    <View
      className="rounded-full border border-hairline"
      style={{ width: size, height: size, backgroundColor: s?.hex }}
    />
  );
}

// A family reads as ONE rounded square quartered into four of its shades (legacy .pf-tile) —
// never a row of circles, which reads as four separate answers rather than one family.
export function FamilyTile({
  family,
  size = 48,
}: {
  family: { name: string; tile: readonly Shade[] };
  size?: number;
}) {
  return (
    <View
      className="flex-row flex-wrap overflow-hidden rounded-soft"
      style={{ width: size, height: size }}
    >
      {family.tile.map((s) => (
        <View key={s.id} style={{ width: size / 2, height: size / 2, backgroundColor: s.hex }} />
      ))}
    </View>
  );
}

// "Navy · Optic white · Stripes", or nothing when no colour is set.
export function colourSummary(v: PieceColour): string {
  const names = [v.colourShade, ...v.colourExtra].map((id) => shade(id)?.name).filter(Boolean);
  const print = pattern(v.print)?.name;
  return [...names, ...(print ? [print] : [])].join(' · ');
}

// A print is a rounded square of its own pattern, to the family tile's shape.
export function PatternSwatch({ hex, size = 48 }: { hex: string; size?: number }) {
  return (
    <View
      className="rounded-soft border border-hairline"
      style={{ width: size, height: size, backgroundColor: hex }}
    />
  );
}

// The family row, then its shades as named circles — the picker Settings' Your colours uses, so
// a colour reads the same wherever she sets one. The web twin is components/wardrobe/colour-field.
export function ColourPicker({
  value,
  onChange,
  slot,
}: {
  value: PieceColour;
  onChange: (next: PieceColour) => void;
  slot: 'main' | 'extra';
}) {
  const bg = useColor('bg');
  const ink = useColor('ink');
  const chosen = new Set(
    (slot === 'main' ? [value.colourShade] : value.colourExtra).filter(Boolean) as string[],
  );
  const [family, setFamily] = useState(
    () =>
      shade(slot === 'main' ? value.colourShade : (value.colourExtra[0] ?? null))?.family ??
      'blacks',
  );
  const fam = COLOUR_FAMILIES.find((f) => f.id === family);
  return (
    <View className="gap-4">
      {/* The families scroll as one row, so the list never pushes the shades off the drawer. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={copy.families}
        contentContainerClassName="gap-3 pb-1"
      >
        {COLOUR_FAMILIES.map((f) => (
          <Pressable
            key={f.id}
            accessibilityRole="button"
            accessibilityLabel={f.name}
            accessibilityState={{ selected: f.id === family }}
            onPress={() => setFamily(f.id)}
            style={{ width: 64 }}
            className="items-center gap-1.5"
          >
            <View
              className={`rounded-soft p-0.5 ${f.id === family ? 'border-2 border-ink' : 'border border-hairline'}`}
            >
              <FamilyTile family={f} size={44} />
            </View>
            <Text size="caption" tone={f.id === family ? 'ink' : 'muted'} numberOfLines={1}>
              {f.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View className="flex-row flex-wrap gap-y-4">
        {fam?.shades.map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={s.name}
            accessibilityState={{ selected: chosen.has(s.id) }}
            onPress={() => onChange(pickShade(value, s.id, slot))}
            className="w-1/4 items-center gap-1.5 px-1"
          >
            <View
              className="size-12 items-center justify-center rounded-full border border-hairline"
              style={{ backgroundColor: s.hex }}
            >
              {chosen.has(s.id) ? <Icon name="check" size={18} color={s.light ? ink : bg} /> : null}
            </View>
            <Text size="caption" tone="muted" numberOfLines={2} className="text-center">
              {s.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Plain first, then the thirteen.
export function PrintPicker({
  value,
  onChange,
}: {
  value: PieceColour;
  onChange: (next: PieceColour) => void;
}) {
  const ink = useColor('ink');
  const surface = useColor('surface');
  const options: { id: string | null; name: string; hex: string }[] = [
    { id: null, name: copy.plain, hex: surface },
    ...PATTERNS.map((p) => ({ id: p.id, name: p.name, hex: surface })),
  ];
  return (
    <View className="flex-row flex-wrap gap-y-4">
      {options.map((o) => (
        <Pressable
          key={o.id ?? 'plain'}
          accessibilityRole="button"
          accessibilityLabel={o.name}
          accessibilityState={{ selected: value.print === o.id }}
          onPress={() => onChange({ ...value, print: o.id })}
          className="w-1/4 items-center gap-1.5 px-1"
        >
          <View
            className={`size-12 items-center justify-center rounded-soft border ${
              value.print === o.id ? 'border-ink' : 'border-hairline'
            }`}
            style={{ backgroundColor: o.hex }}
          >
            {value.print === o.id ? <Icon name="check" size={18} color={ink} /> : null}
          </View>
          <Text size="caption" tone="muted" numberOfLines={2} className="text-center">
            {o.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
