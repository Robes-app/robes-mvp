import type { DiaryDay, PlanEntry } from '@robes/contracts';
import { diary as copy } from '@robes/copy';
import { dayOotd } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import { fonts, Image, maxFontSizeMultiplier, MIN_TOUCH, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { Pressable, Text as RNText, ScrollView, useWindowDimensions, View } from 'react-native';
import { lookHero, LookTile } from '@/features/looks/LookTile';
import { OnPhoto } from '@/features/looks/LookTiles';
import { renditionUri } from '@/lib/images';

// The slot bleeds to the screen's edges: 44pt of gutter either side of the card, so the Add look
// tile peeks in; the page's own 20pt when the tile stands alone.
const GUTTER = 44;
const PAGE = 20;
const GAP = 10;

// The slot (design 3k, plan §1.5): the selected day's OOTD as one hero card, then the dashed Add
// look tile peeking at the edge; an empty day shows the tile alone, full width. Over the card:
// × takes the look off the day, the lookbook icon changes it from the drawer, and the +N stack
// of the day's other looks opens the day. The web twin is components/home/day-slot.tsx.
export function DaySlot({
  day,
  dayWord,
  onAdd,
  onChange,
  onRemove,
}: {
  day: DiaryDay;
  // 'today' or the weekday, for the labels.
  dayWord: string;
  onAdd: () => void;
  onChange: (entry: PlanEntry) => void;
  onRemove: (entry: PlanEntry) => void;
}) {
  const router = useRouter();
  const window = useWindowDimensions();
  const ootd = dayOotd(day.entries);
  const others = day.entries.filter((e) => e !== ootd);
  const side = ootd ? GUTTER : PAGE;
  const width = window.width - side * 2;
  return (
    <ScrollView
      horizontal
      snapToInterval={width + GAP}
      snapToAlignment="center"
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      scrollEnabled={!!ootd}
      testID="day-slot"
      className="-mx-5"
      contentContainerStyle={{ paddingHorizontal: side, gap: GAP }}
    >
      {ootd ? (
        <LookTile
          look={ootd.look}
          variant="ootd"
          width={width}
          onPress={() => router.push(`/look/${ootd.look.id}?day=${day.date}`)}
          label={copy.slot.open(ootd.look.name)}
          testID="ootd-card"
          onImage={
            <>
              <View className="absolute bottom-3 left-3">
                <OnPhoto icon="book" label={copy.slot.change} size={36} onPress={() => onChange(ootd)} />
              </View>
              {others.length ? <Stack entries={others} date={day.date} dayWord={dayWord} /> : null}
            </>
          }
          corner={<Remove label={copy.slot.remove(ootd.look.name, dayWord)} onPress={() => onRemove(ootd)} />}
        />
      ) : null}
      <AddLookTile dayWord={dayWord} width={width} onPress={onAdd} />
    </ScrollView>
  );
}

// The × on the OOTD: drawn small (28pt, half-cream on the photograph) with the hit area reaching
// out to 44pt.
function Remove({ label, onPress }: { label: string; onPress: () => void }) {
  const ink = useColor('ink');
  const size = 28;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={(MIN_TOUCH - size) / 2}
      style={{ width: size, height: size }}
      className="items-center justify-center rounded-pill bg-bg/50"
    >
      <Icon name="close" size={13} color={ink} />
    </Pressable>
  );
}

// The day's other looks, fanned at the corner of the OOTD: one door into the day.
function Stack({
  entries,
  date,
  dayWord,
}: {
  entries: PlanEntry[];
  date: string;
  dayWord: string;
}) {
  const router = useRouter();
  const rot = ['3deg', '-4deg', '6deg'];
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={copy.slot.moreLabel(entries.length, dayWord)}
      onPress={() => router.push(`/day/${date}`)}
      testID="ootd-stack"
      className="absolute right-3 bottom-3 flex-row-reverse items-end"
    >
      {entries.slice(0, 3).map((e, i) => {
        const uri = renditionUri(lookHero(e.look), 58);
        return (
          <View
            key={e.id}
            style={{
              width: 58,
              transform: [{ rotate: rot[i] ?? '0deg' }],
              zIndex: 10 - i,
              marginRight: i ? -30 : 0,
            }}
            className="overflow-hidden rounded-input border-2 border-surface-raised bg-surface-sunk"
          >
            {uri ? <Image source={uri} alt="" aspect="4:5" /> : <View className="aspect-[4/5]" />}
          </View>
        );
      })}
    </Pressable>
  );
}

// The dashed tile: white on the warm dashed edge, a + in a raised circle, ADD LOOK beneath.
function AddLookTile({
  dayWord,
  width,
  onPress,
}: {
  dayWord: string;
  width: number;
  onPress: () => void;
}) {
  const ink = useColor('ink');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.slot.addLabel(dayWord)}
      onPress={onPress}
      testID="add-look"
      style={{ width }}
      className="overflow-hidden rounded-[6px] border border-dashed border-selected-line bg-surface-raised"
    >
      <View className="aspect-[4/5] items-center justify-center border-b border-dashed border-selected-line bg-surface">
        <View className="size-[52px] items-center justify-center rounded-pill border border-rule-mid bg-surface-raised">
          <Icon name="plus" size={20} color={ink} />
        </View>
      </View>
      <View className="min-h-[45px] items-center justify-center bg-surface px-3.5">
        <RNText
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          className="text-ink-faint uppercase"
          style={{ fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.6 }}
        >
          {copy.slot.add}
        </RNText>
      </View>
    </Pressable>
  );
}
