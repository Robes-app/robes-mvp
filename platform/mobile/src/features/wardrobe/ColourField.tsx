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
import { Button, Pill, SegmentedControl, Text } from '@robes/ui-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

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

// The piece's colour (legacy f3e5b5b): family → shade for the main colour or up to three more,
// and the print.
export function ColourField({
  value,
  onChange,
  check = false,
}: {
  value: PieceColour;
  onChange: (next: PieceColour) => void;
  check?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<'main' | 'extra'>('main');
  const [family, setFamily] = useState(shade(value.colourShade)?.family ?? 'blacks');
  const summary = colourSummary(value);
  const fam = COLOUR_FAMILIES.find((f) => f.id === family);
  const chosen = new Set(slot === 'main' ? [value.colourShade] : value.colourExtra);
  return (
    <View className="gap-3">
      <Text size="small" tone="muted">
        {copy.title}
      </Text>
      <View className="flex-row flex-wrap items-center gap-3">
        <View className="flex-row gap-1">
          {[value.colourShade, ...value.colourExtra].map((id, i) => (
            <ShadeSwatch key={id ?? i} shade={shade(id)} />
          ))}
        </View>
        <Text tone={summary ? 'ink' : 'faint'} italic={!summary}>
          {summary || copy.notSet}
        </Text>
      </View>
      {check ? (
        <Text size="small" tone="muted">
          {copy.check}
        </Text>
      ) : null}
      <Button variant="quiet" className="self-start" onPress={() => setOpen(!open)}>
        {open ? copy.done : copy.change}
      </Button>
      {open ? (
        <View className="gap-4">
          <SegmentedControl
            size="sm"
            label={copy.title}
            options={[
              { value: 'main', label: copy.main },
              { value: 'extra', label: copy.extra },
            ]}
            value={slot}
            onChange={setSlot}
          />
          {slot === 'extra' ? (
            <Text size="small" tone="muted">
              {copy.extraHint}
            </Text>
          ) : null}
          <View accessibilityLabel={copy.families} className="flex-row flex-wrap gap-2">
            {COLOUR_FAMILIES.map((f) => (
              <Pill key={f.id} selected={f.id === family} onPress={() => setFamily(f.id)}>
                {f.name}
              </Pill>
            ))}
          </View>
          <View accessibilityLabel={fam?.name} className="flex-row flex-wrap gap-2">
            {fam?.shades.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityLabel={s.name}
                accessibilityState={{ selected: chosen.has(s.id) }}
                onPress={() => onChange(pickShade(value, s.id, slot))}
                className={`min-h-11 flex-row items-center gap-2 rounded-pill border px-3 ${
                  chosen.has(s.id) ? 'border-ink' : 'border-hairline'
                }`}
              >
                <ShadeSwatch shade={s} size={18} />
                <Text size="small" tone={chosen.has(s.id) ? 'ink' : 'muted'}>
                  {s.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text size="small" tone="muted">
            {copy.print}
          </Text>
          <View accessibilityLabel={copy.print} className="flex-row flex-wrap gap-2">
            <Pill
              selected={value.print === null}
              onPress={() => onChange({ ...value, print: null })}
            >
              {copy.plain}
            </Pill>
            {PATTERNS.map((p) => (
              <Pill
                key={p.id}
                selected={value.print === p.id}
                onPress={() => onChange({ ...value, print: p.id })}
              >
                {p.name}
              </Pill>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
