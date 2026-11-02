import { diary as copy } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import { fonts, maxFontSizeMultiplier, Sheet, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { Pressable, Text as RNText, View } from 'react-native';

// What a day asks when she adds a look (design 3k, plan §1.6): past days "What did you wear?",
// today "What are you wearing?", a day ahead "What will you wear?"; then Pick Look (the drawer)
// or Capture Look (her photo, read into a look for that day). Web twin: components/home/log-sheet.tsx.
export function LogSheet({
  date,
  today,
  onClose,
  onPick,
}: {
  date: string | null;
  today: string;
  onClose: () => void;
  onPick: (date: string) => void;
}) {
  const router = useRouter();
  const open = date !== null;
  const question = !date
    ? ''
    : date < today
      ? copy.log.past
      : date === today
        ? copy.log.today
        : copy.log.ahead;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={question}
      {...(date ? { eyebrow: `${weekdayLong(date)} ${Number(date.slice(8))}` } : {})}
      testID="log-sheet"
    >
      <View>
        <Row
          icon="book"
          label={copy.log.pick}
          testID="log-pick"
          onPress={() => date && onPick(date)}
        />
        <Row
          icon="camera"
          label={copy.log.capture}
          last
          testID="log-capture"
          onPress={() => {
            if (!date) return;
            onClose();
            // The camera opens on arrival: one tap from the day to her photograph.
            router.push({ pathname: '/looks/photo', params: { day: date, start: 'camera' } });
          }}
        />
      </View>
    </Sheet>
  );
}

// One 56pt row: the icon in a 40pt disc, the words, a chevron.
function Row({
  icon,
  label,
  last = false,
  testID,
  onPress,
}: {
  icon: IconName;
  label: string;
  last?: boolean;
  testID: string;
  onPress: () => void;
}) {
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      className={`min-h-14 flex-row items-center gap-3.5 border-hairline border-t px-1 ${last ? 'border-b' : ''}`}
    >
      <View className="size-10 items-center justify-center rounded-pill border border-rule-mid bg-surface">
        <Icon name={icon} size={17} color={ink} />
      </View>
      <RNText
        maxFontSizeMultiplier={maxFontSizeMultiplier.body}
        className="flex-1 text-ink"
        style={{ fontFamily: fonts.sans, fontSize: 13 }}
      >
        {label}
      </RNText>
      <Icon name="forward" size={15} color={faint} />
    </Pressable>
  );
}
