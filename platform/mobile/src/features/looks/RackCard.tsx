import { lookbook } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { palette } from '@robes/tokens';
import {
  fonts,
  maxFontSizeMultiplier,
  photoSource,
  Text,
  typeStyle,
  useColor,
} from '@robes/ui-native';
import { Image } from 'expo-image';
import { Pressable, Text as RNText, View } from 'react-native';

const copy = lookbook.draftLook.rackCard;

// The Rack card (Front Door PRD rev 3 §4.6; docked prompt designs 1d, 1e): before the first piece
// the Pieces tab opens straight onto this dashed card, one line — the hanger, the way in and ›.
// With pieces in her wardrobe it reads "Pick from your wardrobe" and opens the piece picker; with
// none, "Add pieces to your wardrobe" and opens the Add Pieces sheet (W5). Once a piece hangs the
// card moves under the list as the add slot. Web twin: app/src/components/looks/rack-card.tsx.
export function RackCard({
  hasWardrobe,
  onPress,
  testID,
}: {
  hasWardrobe: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <DashedCard
      title={hasWardrobe ? copy.pick : copy.add}
      icon="forward"
      onPress={onPress}
      testID={testID ?? 'rack-card'}
    />
  );
}

// The card's anatomy, shared with a look from her photograph (Capture PRD 1c.3: FROM YOUR PHOTO ·
// Find the pieces), whose column holds the photograph under a veil with the hanger on a badge.
// With no eyebrow and no sub it is the compact one-line card (the Rack card, 1d).
export function DashedCard({
  eyebrow,
  title,
  sub,
  icon,
  photo,
  onPress,
  testID,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  icon: 'forward' | 'plus';
  // Her photograph in the column, in place of the hanger on its warm ground.
  photo?: string | null;
  onPress: () => void;
  testID: string;
}) {
  const ink = useColor('ink');
  const warm = useColor('accent-warm');
  const compact = !eyebrow && !sub;
  const column = compact ? 40 : 52;
  const disc = compact ? 24 : 32;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      {...(sub ? { accessibilityHint: sub } : {})}
      onPress={onPress}
      testID={testID}
      className="flex-row items-stretch overflow-hidden rounded-soft border-selected-line"
      style={{ borderWidth: 1, borderStyle: 'dashed' }}
    >
      {photo ? (
        <View
          className="border-selected-line bg-surface-sunk"
          style={{ width: 52, borderRightWidth: 1, borderStyle: 'dashed' }}
        >
          <Image
            source={photoSource(photo)}
            contentFit="cover"
            contentPosition={{ left: '50%', top: '20%' }}
            accessible={false}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View className="absolute inset-0" style={{ backgroundColor: `${palette.cream50}59` }} />
          <View
            className="absolute items-center justify-center rounded-pill bg-surface-raised"
            style={{ right: 4, bottom: 4, width: 18, height: 18 }}
          >
            <Icon name="wardrobe" size={11} color={warm} />
          </View>
        </View>
      ) : (
        <View
          className={`items-center justify-center border-selected-line ${compact ? '' : 'bg-selected'}`}
          style={{ width: column, borderRightWidth: 1, borderStyle: 'dashed' }}
        >
          <Icon name="wardrobe" size={compact ? 15 : 18} color={warm} />
        </View>
      )}
      <View
        className="flex-1 gap-0.5 pl-3.5"
        style={
          compact
            ? { minHeight: 48, justifyContent: 'center', paddingVertical: 8 }
            : { paddingVertical: 12 }
        }
      >
        {eyebrow ? (
          <RNText
            maxFontSizeMultiplier={maxFontSizeMultiplier.label}
            className="text-accent-warm"
            style={typeStyle('label')}
          >
            {eyebrow}
          </RNText>
        ) : null}
        <RNText
          numberOfLines={1}
          className="text-ink"
          style={{
            fontFamily: fonts.display,
            fontSize: compact ? 16 : 19,
            lineHeight: compact ? 20 : 24,
          }}
        >
          {title}
        </RNText>
        {sub ? (
          <Text size="small" tone="muted" numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <View className="justify-center pr-3">
        <View
          className="items-center justify-center rounded-pill bg-selected"
          style={{ width: disc, height: disc }}
        >
          <Icon name={icon} size={compact ? 12 : 14} color={ink} />
        </View>
      </View>
    </Pressable>
  );
}
