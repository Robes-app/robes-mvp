import { firstRun as copy, you } from '@robes/copy';
import { COLOUR_FAMILIES } from '@robes/core/colour';
import { type BrandMark, brandMark, STYLE_TYPES, type StyleType } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/native';
import { fonts, maxFontSizeMultiplier, PreferenceControl, useColor } from '@robes/ui-native';
import { Image } from 'expo-image';
import { Pressable, Text as RNText, View } from 'react-native';
import { FamilyTile } from '@/features/wardrobe/ColourField';
import { archetypeImages } from './archetype-images';

export const IDENTITIES = ['woman', 'man', 'non_binary', 'unspecified'] as const;
export type Identity = (typeof IDENTITIES)[number];
export type Colours = Partial<Record<string, 1 | -1>>;

// Selected is the warm fill with its edge, never black; unselected is white on a hairline.
const choice = (on: boolean) =>
  on ? 'border-selected-line bg-selected' : 'border-hairline bg-surface-raised';

// Sizes, faces and colours ride inline here: a size or colour class beside Text's own defaults
// can lose to them in Uniwind, which is why these labels ran small and grey (redline audit 30 Oct).
const serif18 = { fontFamily: fonts.displayRegular, fontSize: 18, lineHeight: 22 } as const;
const serif20 = { fontFamily: fonts.displayRegular, fontSize: 20, lineHeight: 24 } as const;

// 02 Identity (twin: app/src/app/onboarding/steps.tsx IdentityStep): one answer, required.
export function IdentityStep({
  value,
  onChange,
}: {
  value: Identity | null;
  onChange: (v: Identity) => void;
}) {
  const ink = useColor('ink');
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={copy.identity.title}
      className="gap-2.5"
    >
      {IDENTITIES.map((id) => {
        const on = value === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(id)}
            className={`min-h-14 flex-row items-center justify-between rounded-soft border px-4 py-4 ${choice(on)}`}
          >
            <RNText
              maxFontSizeMultiplier={maxFontSizeMultiplier.body}
              style={[serif18, { color: ink }]}
            >
              {you.model.presenceOptions[id]}
            </RNText>
            <View
              className={`size-[18px] items-center justify-center rounded-full border ${on ? 'border-selected-line bg-selected' : 'border-border-control'}`}
            >
              {on ? <Icon name="check" size={10} color={ink} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// 03 Styles (twin: StylesStep): eight archetypes, four photographs each.
export function StylesStep({
  identity,
  value,
  onToggle,
}: {
  identity: Identity | null;
  value: readonly StyleType[];
  onToggle: (t: StyleType) => void;
}) {
  const rose = useColor('accent-inspire');
  const ink = useColor('ink');
  return (
    <View className="gap-2.5">
      {STYLE_TYPES.map((type) => {
        const on = value.includes(type);
        return (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={copy.styles.love(type)}
            accessibilityState={{ selected: on }}
            onPress={() => onToggle(type)}
            className={`rounded-card border p-[5px] ${choice(on)}`}
          >
            <View className="h-[164px] flex-row gap-[3px] overflow-hidden rounded-[10px]">
              {archetypeImages(type, identity).map(({ key, src }) =>
                src ? (
                  <View key={key} className="h-full flex-1 bg-surface-sunk">
                    <Image
                      source={src}
                      contentFit="cover"
                      accessible={false}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                ) : (
                  <View key={key} className="h-full flex-1 bg-surface-sunk" />
                ),
              )}
            </View>
            <View className="min-h-9 flex-row items-center justify-between px-1.5 pt-1.5 pb-0.5">
              <RNText
                maxFontSizeMultiplier={maxFontSizeMultiplier.body}
                style={[serif20, { color: ink }]}
              >
                {type}
              </RNText>
              <Icon name="heart" size={18} color={rose} filled={on} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// Each loaded face by weight (Inter 300–500, Cormorant 300–400), so a wordmark never asks for a
// face the app hasn't loaded.
function markFont(m: BrandMark): string {
  if (m.face === 'serif') {
    if (m.italic) return m.weight >= 400 ? fonts.displayRegularItalic : fonts.displayItalic;
    return m.weight >= 400 ? fonts.displayRegular : fonts.display;
  }
  return m.weight >= 500 ? fonts.sansMedium : m.weight >= 400 ? fonts.sansRegular : fonts.sans;
}

// 04 Brands (twin: BrandsStep): each house set as its own wordmark, on one line (the few too
// long for it stack on purpose), in ink whether chosen or not.
export function BrandsStep({
  wall,
  value,
  onToggle,
}: {
  wall: readonly string[];
  value: readonly string[];
  onToggle: (b: string) => void;
}) {
  const ink = useColor('ink');
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {wall.map((name) => {
        const on = value.includes(name);
        const m = brandMark(name);
        return (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityState={{ selected: on }}
            onPress={() => onToggle(name)}
            className={`h-[66px] basis-[31%] grow items-center justify-center overflow-hidden rounded-input border px-1.5 ${choice(on)}`}
          >
            <RNText
              maxFontSizeMultiplier={maxFontSizeMultiplier.label}
              numberOfLines={m.lines ? m.lines.length : 1}
              style={{
                color: ink,
                textAlign: 'center',
                fontFamily: markFont(m),
                fontSize: m.size,
                lineHeight: Math.round(m.size * (m.lines ? 1.15 : 1.1)),
                letterSpacing: m.tracking * m.size,
                textTransform: m.upper ? 'uppercase' : 'none',
              }}
            >
              {m.lines ? m.lines.join('\n') : name}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

// 05 Colours (twin: ColoursStep): You › Colours' families without shades.
export function ColoursStep({
  value,
  onChange,
}: {
  value: Colours;
  onChange: (family: string, v: -1 | 0 | 1) => void;
}) {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  return (
    <View className="border-hairline border-t">
      {COLOUR_FAMILIES.map((f) => {
        const v = value[f.id] ?? 0;
        return (
          <View
            key={f.id}
            className={`flex-row items-center gap-4 border-hairline border-b px-2.5 py-2 ${v === 1 ? 'bg-surface-sunk' : ''}`}
          >
            {/* Avoid greys the swatch; the name softens to ink-muted, which still reads at 4.5:1. */}
            <View style={v === -1 ? { opacity: 0.4 } : undefined}>
              <FamilyTile family={f} size={34} shape="tile" />
            </View>
            <RNText
              maxFontSizeMultiplier={maxFontSizeMultiplier.body}
              style={{
                flex: 1,
                fontSize: 14,
                fontFamily: v === 1 ? fonts.sansMedium : fonts.sans,
                color: v === -1 ? muted : ink,
              }}
            >
              {f.name}
            </RNText>
            <PreferenceControl
              label={copy.colours.control(f.name)}
              value={v}
              labels={you.style.palette.states}
              onChange={(next) => onChange(f.id, next)}
            />
          </View>
        );
      })}
    </View>
  );
}
