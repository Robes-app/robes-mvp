import { lookbook } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { fonts, maxFontSizeMultiplier, Text, typeStyle, useColor } from '@robes/ui-native';
import { Pressable, Text as RNText, View } from 'react-native';

const copy = lookbook.draftLook.rackCard;

// The Rack card (Front Door PRD rev 3 §4.6): before the first piece the Pieces tab opens straight
// onto this dashed card — the hanger on its warm column, YOUR WARDROBE, then the way in. With
// pieces in her wardrobe it reads "Pick from your wardrobe / Or let Robes style below" and › opens
// the Add Pieces picker; with none, "Add your pieces / Photo, link or receipt" and + opens the Add
// your pieces sheet. Once a piece hangs the card moves under the list as the add slot. Web twin:
// app/src/components/looks/rack-card.tsx.
export function RackCard({
  hasWardrobe,
  onPress,
  testID,
}: {
  hasWardrobe: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const ink = useColor('ink');
  const warm = useColor('accent-warm');
  const title = hasWardrobe ? copy.pick : copy.add;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={hasWardrobe ? copy.orRobes : copy.ways}
      onPress={onPress}
      testID={testID ?? 'rack-card'}
      className="flex-row items-stretch overflow-hidden rounded-soft border-selected-line"
      style={{ borderWidth: 1, borderStyle: 'dashed' }}
    >
      <View
        className="items-center justify-center border-selected-line bg-selected"
        style={{ width: 52, borderRightWidth: 1, borderStyle: 'dashed' }}
      >
        <Icon name="wardrobe" size={18} color={warm} />
      </View>
      <View className="flex-1 gap-0.5 py-3 pl-3.5">
        <RNText
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          className="text-accent-warm"
          style={typeStyle('label')}
        >
          {copy.eyebrow}
        </RNText>
        <RNText
          numberOfLines={1}
          className="text-ink"
          style={{ fontFamily: fonts.display, fontSize: 19, lineHeight: 24 }}
        >
          {title}
        </RNText>
        <Text size="small" tone="muted" numberOfLines={1}>
          {hasWardrobe ? copy.orRobes : copy.ways}
        </Text>
      </View>
      <View className="justify-center pr-3">
        <View
          className="items-center justify-center rounded-pill bg-selected"
          style={{ width: 32, height: 32 }}
        >
          <Icon name={hasWardrobe ? 'forward' : 'plus'} size={14} color={ink} />
        </View>
      </View>
    </Pressable>
  );
}
