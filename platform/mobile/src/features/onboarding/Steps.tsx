import { firstRun as copy, you } from '@robes/copy';
import { type BrandMark, brandMark, STYLE_TYPES, type StyleType } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/native';
import { fonts, maxFontSizeMultiplier, useColor } from '@robes/ui-native';
import { Image } from 'expo-image';
import { Pressable, Text as RNText, View } from 'react-native';
import { archetypeImages } from './archetype-images';

export const IDENTITIES = ['woman', 'man', 'non_binary', 'unspecified'] as const;
export type Identity = (typeof IDENTITIES)[number];

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
            <View className="h-[164px] flex-row gap-[3px] overflow-hidden rounded-thumb">
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
// long for it stack on purpose), in ink whether chosen or not. `add` leads the wall with a dashed
// tile for a house that isn't on it (You › Style DNA › Brands).
export function BrandsStep({
  wall,
  value,
  onToggle,
  add,
}: {
  wall: readonly string[];
  value: readonly string[];
  onToggle: (b: string) => void;
  add?: { label: string; onPress: () => void };
}) {
  const ink = useColor('ink');
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {add ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={add.label}
          onPress={add.onPress}
          className="h-[66px] basis-[31%] grow items-center justify-center gap-1 overflow-hidden rounded-input border border-selected-line border-dashed bg-surface px-1.5"
        >
          <Icon name="plus" size={14} color={ink} />
          <RNText
            maxFontSizeMultiplier={maxFontSizeMultiplier.label}
            numberOfLines={1}
            style={{ color: ink, fontFamily: fonts.sans, fontSize: 11 }}
          >
            {add.label}
          </RNText>
        </Pressable>
      ) : null}
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
