import { wardrobe } from '@robes/copy';
import {
  COLOUR_FAMILIES,
  PATTERN_PAINT,
  PATTERNS,
  type PieceColour,
  pattern,
  pickShade,
  type Shade,
  shade,
} from '@robes/core/colour';
import { Icon } from '@robes/icons/native';
import { fonts, Text, useColor } from '@robes/ui-native';
import { type ReactNode, useRef, useState } from 'react';
import {
  type AccessibilityRole,
  type AccessibilityState,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  View,
} from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

const copy = wardrobe.colour;

// Swatch colours are the colour model's data (a metallic draws its base hex here), not tokens.
export function ShadeSwatch({ shade: s, size = 22 }: { shade: Shade | null; size?: number }) {
  return (
    <View
      testID={`shade-swatch-${s?.id ?? 'none'}`}
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
  shape = 'soft',
}: {
  family: { name: string; tile: readonly Shade[] };
  size?: number;
  // tile: onboarding's small square, 5pt corners on a hairline (redline audit 30 Oct; twin:
  // app/src/components/wardrobe/colour-field.tsx).
  shape?: 'soft' | 'tile';
}) {
  const edge = useColor('rule-mid');
  return (
    <View
      className={`flex-row flex-wrap overflow-hidden ${shape === 'tile' ? '' : 'rounded-soft'}`}
      style={[
        { width: size, height: size },
        shape === 'tile' ? { borderRadius: 5, borderWidth: 0.5, borderColor: edge } : null,
      ]}
    >
      {family.tile.map((s) => (
        // Halves, not size / 2: the tile's hairline takes its share of the box.
        <View key={s.id} style={{ width: '50%', height: '50%', backgroundColor: s.hex }} />
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

const { ink: I, ground: G0, sand, tiedye, camo } = PATTERN_PAINT;

// Each print drawn in SVG on a 24-unit tile (the web paints its css), from the colour model's own
// paint. A print without a drawing here is a hairline tile of its ground, never a blank square.
function printArt(id: string): ReactNode {
  const range = (n: number, step: number, from = 0) =>
    Array.from({ length: Math.ceil((n - from) / step) }, (_, i) => from + i * step);
  switch (id) {
    case 'stripes':
      return range(24, 7).map((y) => <Rect key={y} x={0} y={y} width={24} height={3} fill={I} />);
    case 'checks':
      return (
        <G opacity={0.42}>
          {range(24, 12).map((p) => (
            <G key={p}>
              <Rect x={0} y={p} width={24} height={6} fill={I} />
              <Rect x={p} y={0} width={6} height={24} fill={I} />
            </G>
          ))}
        </G>
      );
    case 'plaid':
      return range(24, 12).map((p) => (
        <G key={p}>
          <Rect x={p} y={0} width={2} height={24} fill={I} opacity={0.75} />
          <Rect x={0} y={p} width={24} height={2} fill={I} opacity={0.75} />
          <Rect x={p + 5} y={0} width={4} height={24} fill={I} opacity={0.22} />
          <Rect x={0} y={p + 5} width={24} height={4} fill={I} opacity={0.22} />
        </G>
      ));
    case 'houndstooth':
      return range(24, 6).flatMap((y) =>
        range(24, 6).map((x) =>
          (x + y) % 12 === 0 ? (
            <Path key={`${x}-${y}`} d={`M${x} ${y}h3l3 3v3h-3l-3-3z`} fill={I} />
          ) : null,
        ),
      );
    case 'dots':
      return range(24, 6, 3).flatMap((y) =>
        range(24, 6, 3).map((x) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.4} fill={I} />),
      );
    case 'florals':
      return range(24, 10, 5).flatMap((y) =>
        range(24, 10, 5).map((x) => (
          <G key={`${x}-${y}`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <Circle
                key={a}
                cx={x + 2.2 * Math.cos((a * Math.PI) / 180)}
                cy={y + 2.2 * Math.sin((a * Math.PI) / 180)}
                r={1.3}
                fill={I}
              />
            ))}
          </G>
        )),
      );
    case 'animal':
      return (
        <>
          <Rect width={24} height={24} fill={sand} />
          <Ellipse cx={5} cy={6} rx={3} ry={2} fill={I} />
          <Ellipse cx={16} cy={9} rx={2} ry={3} fill={I} />
          <Ellipse cx={8} cy={17} rx={2.5} ry={1.8} fill={I} />
          <Ellipse cx={19} cy={20} rx={2} ry={2.6} fill={I} />
        </>
      );
    case 'paisley':
      return range(24, 12, 6).flatMap((y) =>
        range(24, 12, 6).map((x) => (
          <Path key={`${x}-${y}`} d={`M${x} ${y - 4}c3 0 4 3 3 5s-3 3-4 2 0-3 1-3`} fill={I} />
        )),
      );
    case 'graphic':
      return (
        <>
          <Circle cx={12} cy={12} r={5} fill={I} />
          <Circle cx={12} cy={12} r={8.5} fill="none" stroke={I} strokeWidth={1.5} />
        </>
      );
    case 'abstract':
      return (
        <>
          <Rect x={0} y={0} width={12} height={12} fill={I} />
          <Rect x={12} y={12} width={12} height={12} fill={I} />
          <Path d="M12 0h12v12z" fill={I} />
        </>
      );
    case 'tiedye':
      return [10, 8, 6, 4, 2].map((r, i) => (
        <Circle key={r} cx={12} cy={12} r={r * 1.7} fill={tiedye[i % tiedye.length]} />
      ));
    case 'camo':
      return (
        <>
          <Rect width={24} height={24} fill={camo[0]} />
          <Ellipse cx={6} cy={7} rx={5} ry={3.5} fill={camo[1]} />
          <Ellipse cx={17} cy={16} rx={4} ry={5} fill={camo[2]} />
          <Ellipse cx={18} cy={4} rx={3} ry={2} fill={camo[2]} />
          <Ellipse cx={5} cy={19} rx={3.5} ry={2.5} fill={camo[1]} />
        </>
      );
    case 'other':
      return range(48, 6).map((p) => (
        <Line
          key={p}
          x1={p}
          y1={0}
          x2={p - 24}
          y2={24}
          stroke={I}
          strokeWidth={0.8}
          opacity={0.5}
        />
      ));
    default:
      return null;
  }
}

// A print's own rounded square, to the family tile's shape; Plain (no id) is the white ground.
export function PrintSwatch({ id, size = 24 }: { id: string | null; size?: number }) {
  const plain = useColor('surface-raised');
  const art = id ? printArt(id) : null;
  return (
    <View
      testID={`print-swatch-${id ?? 'plain'}`}
      // A row-sized square keeps the small radius, or it reads as a dot.
      className={`overflow-hidden border border-hairline ${size < 24 ? 'rounded-crisp' : 'rounded-soft'}`}
      style={{ width: size, height: size, backgroundColor: art ? G0 : plain }}
    >
      {art ? (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Defs>
            <ClipPath id={`print-${id}`}>
              <Rect width={24} height={24} />
            </ClipPath>
          </Defs>
          <G clipPath={`url(#print-${id})`}>{art}</G>
        </Svg>
      ) : null}
    </View>
  );
}

// One answer in a drawer's list (beta's sheets): a 44pt row, the warm edge and a check when it is
// hers, white otherwise. The print, material and category lists all use it. Web twin: OptionRow in
// components/wardrobe/colour-field.tsx.
export function OptionRow({
  label,
  hint,
  selected = false,
  icon,
  italic = false,
  trailing,
  onPress,
  accessibilityRole = 'button',
  accessibilityState,
}: {
  label: string;
  hint?: string | null;
  selected?: boolean;
  icon?: ReactNode;
  // The serif italic line (the category drill's "Just jumpers & sweaters").
  italic?: boolean;
  // What sits at the right when the row isn't picked (a drill's chevron).
  trailing?: ReactNode;
  onPress: () => void;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
}) {
  const ink = useColor('ink');
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      accessibilityState={accessibilityState ?? { selected }}
      onPress={onPress}
      className={`min-h-11 flex-row items-center gap-3 rounded-crisp border px-3 py-2 ${
        selected ? 'border-selected-line bg-selected' : 'border-transparent'
      }`}
    >
      {icon}
      <View className="min-w-0 flex-1">
        {italic ? (
          <Text italic size="caption">
            {label}
          </Text>
        ) : (
          <Text style={{ fontFamily: fonts.sans, fontSize: 15 }}>{label}</Text>
        )}
        {hint ? (
          <Text tone="faint" style={{ fontSize: 11 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      {selected ? <Icon name="check" size={18} color={ink} /> : trailing}
    </Pressable>
  );
}

// A row of chips she scrolls sideways opens with the chosen one in view, 24pt in from the edge
// (redline 09/10), rather than wherever the list happens to start.
export function useScrollToChosen() {
  const ref = useRef<ScrollViewInstance>(null);
  const done = useRef(false);
  const onChosenLayout = (e: LayoutChangeEvent) => {
    if (done.current) return;
    done.current = true;
    ref.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - 24), animated: false });
  };
  return { ref, onChosenLayout };
}

// The family row, then its shades as named circles — the picker Settings' Your colours uses, so
// a colour reads the same wherever she sets one. It opens on the family of what is filed, scrolled
// into view and warm; a picked shade carries the warm ring and the check (redline 09). The web twin
// is components/wardrobe/colour-field.
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
  const { ref, onChosenLayout } = useScrollToChosen();
  const fam = COLOUR_FAMILIES.find((f) => f.id === family);
  return (
    <View className="gap-4">
      {/* The families scroll as one row, so the list never pushes the shades off the drawer. */}
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={copy.families}
        contentContainerClassName="gap-2 pb-1"
      >
        {COLOUR_FAMILIES.map((f) => (
          <Pressable
            key={f.id}
            accessibilityRole="button"
            accessibilityLabel={f.name}
            accessibilityState={{ selected: f.id === family }}
            onPress={() => setFamily(f.id)}
            {...(f.id === family ? { onLayout: onChosenLayout } : {})}
            style={{ width: 72 }}
            className={`items-center gap-1.5 rounded-crisp border px-1 py-1.5 ${
              f.id === family ? 'border-selected-line bg-selected' : 'border-transparent'
            }`}
          >
            <FamilyTile family={f} size={44} />
            <Text
              size="caption"
              tone={f.id === family ? 'ink' : 'muted'}
              weight={f.id === family ? 'medium' : 'regular'}
              numberOfLines={1}
            >
              {f.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View className="flex-row flex-wrap border-hairline border-t pt-4" style={{ rowGap: 16 }}>
        {fam?.shades.map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={s.name}
            accessibilityState={{ selected: chosen.has(s.id) }}
            onPress={() => onChange(pickShade(value, s.id, slot))}
            className="w-1/3 items-center gap-1.5 px-1"
          >
            {/* The warm ring sits 3pt off the swatch; unpicked, its edge is clear so nothing moves. */}
            <View
              className={`rounded-full ${chosen.has(s.id) ? 'border-selected-line' : 'border-transparent'}`}
              style={{ borderWidth: 2, padding: 3 }}
            >
              <View
                className="size-14 items-center justify-center rounded-full border border-hairline"
                style={{ backgroundColor: s.hex }}
              >
                {chosen.has(s.id) ? (
                  <Icon name="check" size={20} color={s.light ? ink : bg} />
                ) : null}
              </View>
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

// Plain first, then the thirteen, as a list (beta): a 24pt square of the print beside its name,
// the warm row and a check on hers. A pick is the answer.
export function PrintPicker({
  value,
  onChange,
}: {
  value: PieceColour;
  onChange: (next: PieceColour) => void;
}) {
  const options: { id: string | null; name: string }[] = [
    { id: null, name: copy.plain },
    ...PATTERNS.map((p) => ({ id: p.id, name: p.name })),
  ];
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={copy.print}>
      {options.map((o) => (
        <OptionRow
          key={o.id ?? 'plain'}
          accessibilityRole="radio"
          accessibilityState={{ checked: value.print === o.id }}
          selected={value.print === o.id}
          label={o.name}
          icon={<PrintSwatch id={o.id} />}
          onPress={() => onChange({ ...value, print: o.id })}
        />
      ))}
    </View>
  );
}
