import type { DiaryDay, PlanEntry } from '@robes/contracts';
import { diary as copy, lookbook } from '@robes/copy';
import { dayOotd } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { Pressable, Text as RNText, ScrollView, useWindowDimensions, View } from 'react-native';
import { LookTile } from '@/features/looks/LookTile';
import { OnPhoto } from '@/features/looks/LookTiles';
import { DraftTile } from './DraftTile';

// The slot bleeds to the screen's edges: 44pt of gutter either side of the card, so the next card
// peeks in; the page's own 20pt when the Add look tile stands alone.
const GUTTER = 44;
const PAGE = 20;
const GAP = 10;

// The slot (design 3k, plan 2026-11-02 §1.5; 2026-11-03 §7 D7): the selected day's looks as
// cards in one scroller — the OOTD first, then the others — then the draft Robes is making for
// the day (plan 2026-11-03 §1.2), then the dashed Add look tile peeking at the edge; an empty day
// shows the tile alone, full width. Over a card: × takes the look off the day, the lookbook icon
// changes it from the drawer. The web twin is components/home/day-slot.tsx.
export function DaySlot({
  day,
  today,
  dayWord,
  justSaved = null,
  onAdd,
  onChange,
  onRemove,
  onAnother,
  anotherBusy = false,
}: {
  day: DiaryDay;
  today: string;
  // 'today' or the weekday, for the labels.
  dayWord: string;
  // The look just saved from the draft: its card says so for a moment.
  justSaved?: string | null;
  onAdd: () => void;
  onChange: (entry: PlanEntry) => void;
  onRemove: (entry: PlanEntry) => void;
  onAnother: (lookId: string) => void;
  anotherBusy?: boolean;
}) {
  const router = useRouter();
  const window = useWindowDimensions();
  const ootd = dayOotd(day.entries);
  const cards = ootd ? [ootd, ...day.entries.filter((e) => e !== ootd)] : [];
  const draft = day.date >= today ? day.draft : null;
  const scrolls = cards.length > 0 || draft !== null;
  const side = scrolls ? GUTTER : PAGE;
  const width = window.width - side * 2;
  return (
    <ScrollView
      horizontal
      snapToInterval={width + GAP}
      snapToAlignment="center"
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      scrollEnabled={scrolls}
      testID="day-slot"
      className="-mx-5"
      contentContainerStyle={{ paddingHorizontal: side, gap: GAP }}
    >
      {cards.map((entry, i) => (
        <LookTile
          key={entry.id}
          look={entry.look}
          variant="ootd"
          width={width}
          onPress={() => router.push(`/look/${entry.look.id}?day=${day.date}`)}
          label={copy.slot.open(entry.look.name)}
          testID={i === 0 ? 'ootd-card' : `day-card-${entry.id}`}
          onImage={
            <>
              <View className="absolute bottom-3 left-3">
                <OnPhoto
                  icon="book"
                  label={copy.slot.change}
                  size={36}
                  onPress={() => onChange(entry)}
                />
              </View>
              {justSaved === entry.look.id ? (
                <View
                  testID="saved-badge"
                  className="absolute top-2.5 left-2.5 rounded-pill bg-surface-raised px-2.5 py-1.5"
                >
                  <RNText
                    maxFontSizeMultiplier={maxFontSizeMultiplier.label}
                    className="text-accent-plan uppercase"
                    style={{ fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 1.8 }}
                  >
                    ✓ {lookbook.draft.badgeSaved}
                  </RNText>
                </View>
              ) : null}
            </>
          }
          corner={
            <Remove
              label={copy.slot.remove(entry.look.name, dayWord)}
              onPress={() => onRemove(entry)}
            />
          }
        />
      ))}
      {draft ? (
        <DraftTile
          draft={draft}
          day={day}
          today={today}
          width={width}
          onAnother={onAnother}
          anotherBusy={anotherBusy}
        />
      ) : null}
      <AddLookTile dayWord={dayWord} width={width} onPress={onAdd} />
    </ScrollView>
  );
}

// The × on a card: drawn small (28pt, half-cream on the photograph) with the hit area reaching
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
