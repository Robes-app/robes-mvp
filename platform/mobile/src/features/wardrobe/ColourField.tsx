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
import { type ReactNode, useState } from 'react';
import { type AccessibilityRole, type AccessibilityState, Pressable, View } from 'react-native';
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
export function PrintSwatch({
  id,
  size = 24,
  round = false,
}: {
  id: string | null;
  size?: number;
  // A circle, as a shade's swatch beside it in a list (canvas 3b's print rows).
  round?: boolean;
}) {
  const plain = useColor('surface-raised');
  const art = id ? printArt(id) : null;
  return (
    <View
      testID={`print-swatch-${id ?? 'plain'}`}
      // A row-sized square keeps the small radius, or it reads as a dot.
      className={`overflow-hidden border border-hairline ${round ? 'rounded-full' : size < 24 ? 'rounded-crisp' : 'rounded-soft'}`}
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
// hers, white otherwise. The category drill and the seasons use it. Web twin: OptionRow in
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

// One answer in a family list: the shade's swatch (or nothing, for a material), its name and hint,
// the check when it is hers. A disabled answer is dimmed (the main colour among the additional).
export interface FamilyItem {
  id: string;
  name: string;
  hint?: string | null;
  swatch?: ReactNode;
  selected: boolean;
  disabled?: boolean;
  onPick: () => void;
}

export interface FamilyGroup {
  id: string;
  name: string;
  // The family's quartered tile (colour); a material family has none.
  tile?: ReactNode;
  items: FamilyItem[];
}

// Canvas 3b's family list (Annie, 10 Nov): the families in one white card, one open at a time. A
// family's header turns its chevron and lays its answers beneath; closed, it names what is picked
// inside it. It opens on the family of what is filed. The colour, additional colour and material
// drawers all use it. Web twin: FamilyList in components/wardrobe/colour-field.tsx.
export function FamilyList({
  groups,
  initial,
  itemRole,
}: {
  groups: readonly FamilyGroup[];
  initial: string | null;
  // radio: one answer (material); button: pressed answers (a colour, the additional colours).
  itemRole: 'radio' | 'button';
}) {
  const [open, setOpen] = useState(initial);
  const ink = useColor('ink');
  const soft = useColor('ink-muted');
  return (
    <View className="overflow-hidden rounded-[12px] border border-rule-mid bg-surface-raised">
      {groups.map((g, i) => {
        const isOpen = g.id === open;
        const picked = g.items
          .filter((it) => it.selected)
          .map((it) => it.name)
          .join(', ');
        return (
          <View key={g.id} className={i ? 'border-hairline border-t' : ''}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={picked && !isOpen ? `${g.name}, ${picked}` : g.name}
              accessibilityState={{ expanded: isOpen }}
              onPress={() => setOpen(isOpen ? null : g.id)}
              className="flex-row items-center px-4"
              style={{ minHeight: g.tile ? 60 : 52, gap: 14 }}
            >
              {g.tile}
              <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15 }}>{g.name}</Text>
                <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
                  <Icon name="down" size={12} color={soft} />
                </View>
              </View>
              {picked && !isOpen ? (
                <Text
                  tone="faint"
                  numberOfLines={1}
                  style={{ maxWidth: '45%', fontFamily: fonts.sans, fontSize: 13 }}
                >
                  {picked}
                </Text>
              ) : null}
            </Pressable>
            {isOpen ? (
              <View
                accessibilityRole={itemRole === 'radio' ? 'radiogroup' : undefined}
                accessibilityLabel={g.name}
                className="pb-2.5"
              >
                {g.items.map((it) => (
                  <Pressable
                    key={it.id}
                    accessibilityRole={itemRole}
                    accessibilityLabel={it.name}
                    accessibilityState={
                      itemRole === 'radio'
                        ? { checked: it.selected, disabled: Boolean(it.disabled) }
                        : { selected: it.selected, disabled: Boolean(it.disabled) }
                    }
                    disabled={it.disabled}
                    onPress={it.onPick}
                    className="flex-row items-center pr-4"
                    style={{
                      minHeight: it.hint ? 52 : 44,
                      paddingLeft: it.swatch ? 66 : 32,
                      gap: 14,
                      opacity: it.disabled ? 0.35 : 1,
                    }}
                  >
                    {it.swatch}
                    <View className="min-w-0 flex-1" style={{ gap: 3 }}>
                      <Text style={{ fontFamily: fonts.sans, fontSize: 14 }}>{it.name}</Text>
                      {it.hint ? (
                        <Text tone="faint" style={{ fontFamily: fonts.sans, fontSize: 12 }}>
                          {it.hint}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ opacity: it.selected ? 1 : 0 }}>
                      <Icon name="check" size={15} color={ink} />
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// The colour families as a FamilyList (canvas 3b): each family's tile, its shades as named circles.
// A pick of the main colour is the answer; the additional colours are pressed as many as there
// are (up to three), and the main colour sits dimmed among them. The web twin is
// components/wardrobe/colour-field.
export function ColourPicker({
  value,
  onChange,
  slot,
}: {
  value: PieceColour;
  onChange: (next: PieceColour) => void;
  slot: 'main' | 'extra';
}) {
  const chosen = new Set(
    (slot === 'main' ? [value.colourShade] : value.colourExtra).filter(Boolean) as string[],
  );
  const home =
    shade(slot === 'main' ? value.colourShade : (value.colourExtra[0] ?? null))?.family ??
    COLOUR_FAMILIES[0]?.id ??
    null;
  return (
    <FamilyList
      initial={home}
      itemRole="button"
      groups={COLOUR_FAMILIES.map((f) => ({
        id: f.id,
        name: f.name,
        tile: <FamilyTile family={f} size={36} />,
        items: f.shades.map((s) => ({
          id: s.id,
          name: s.name,
          swatch: <ShadeSwatch shade={s} size={22} />,
          selected: chosen.has(s.id),
          disabled: slot === 'extra' && s.id === value.colourShade,
          onPick: () => onChange(pickShade(value, s.id, slot)),
        })),
      }))}
    />
  );
}

// Plain first, then the thirteen, as one white card of rows (canvas 3b): a round swatch of the
// print, its name, the check on hers. A pick is the answer.
export function PrintPicker({
  value,
  onChange,
}: {
  value: PieceColour;
  onChange: (next: PieceColour) => void;
}) {
  const ink = useColor('ink');
  const options: { id: string | null; name: string }[] = [
    { id: null, name: copy.plain },
    ...PATTERNS.map((p) => ({ id: p.id, name: p.name })),
  ];
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={copy.print}
      className="overflow-hidden rounded-[12px] border border-rule-mid bg-surface-raised"
    >
      {options.map((o, i) => {
        const on = value.print === o.id;
        return (
          <Pressable
            key={o.id ?? 'plain'}
            accessibilityRole="radio"
            accessibilityLabel={o.name}
            accessibilityState={{ checked: on }}
            onPress={() => onChange({ ...value, print: o.id })}
            className={`flex-row items-center px-4 ${i ? 'border-hairline border-t' : ''}`}
            style={{ minHeight: 52, gap: 14 }}
          >
            <PrintSwatch id={o.id} size={26} round />
            <Text
              numberOfLines={1}
              className="min-w-0 flex-1"
              style={{ fontFamily: fonts.sans, fontSize: 14 }}
            >
              {o.name}
            </Text>
            <View style={{ opacity: on ? 1 : 0 }}>
              <Icon name="check" size={15} color={ink} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
