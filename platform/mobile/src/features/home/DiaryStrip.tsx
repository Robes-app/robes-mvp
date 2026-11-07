import type { DiaryDay } from '@robes/contracts';
import { diary as copy } from '@robes/copy';
import { diaryPages, weekdayLong, weekdayShort } from '@robes/core/calendar';
import { fonts, maxFontSizeMultiplier, typeStyle } from '@robes/ui-native';
import { useRef, useState } from 'react';
import {
  Pressable,
  Text as RNText,
  ScrollView,
  type ScrollViewInstance,
  useWindowDimensions,
  View,
} from 'react-native';

const CELL = 43;

// The strip (Front Door design 3k, plan 2026-11-02 §1.4): a pager of seven-day pages, today's page
// centred so three days either side show; swipe for the week before and after. A cell carries one
// mark per look — a ring when planned, a dot once worn — and a day gone by recedes to the faint
// ink: Felix's lighter `warm-past` text misses 4.5:1, and the floor wins (D1). Felix's WeekStrip
// (redline 7 Nov): today always keeps the warm fill, the day picked adds the warm edge, and either
// one's weekday is 500 in ink-soft; a worn mark is `warm-past` (D11).
// The web twin is app/src/components/home/diary-strip.tsx.
export function DiaryStrip({
  days,
  today,
  selected,
  onSelect,
}: {
  days: readonly DiaryDay[];
  today: string;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const scroller = useRef<ScrollViewInstance>(null);
  // The strip bleeds to the screen's edges, so the window's width is a page until layout says.
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width);
  const pages = diaryPages(days);
  const home = Math.max(
    0,
    pages.findIndex((p) => p.some((d) => d.date === today)),
  );
  return (
    <ScrollView
      ref={scroller}
      horizontal
      pagingEnabled
      snapToInterval={width}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={copy.strip.label}
      testID="diary-strip"
      className="-mx-5"
      // Today's page is the one on screen first; a swipe reaches the others.
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w) setWidth(w);
        scroller.current?.scrollTo({ x: (w || width) * home, animated: false });
      }}
    >
      {pages.map((page, i) => (
        <View
          key={page[0]?.date ?? i}
          accessibilityLabel={copy.strip.page(i)}
          style={{ width }}
          className="flex-row justify-between px-5 py-px"
        >
          {page.map((d) => (
            <DayCell
              key={d.date}
              day={d}
              isToday={d.date === today}
              past={d.date < today}
              selected={d.date === selected}
              onSelect={() => onSelect(d.date)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function DayCell({
  day,
  isToday,
  past,
  selected,
  onSelect,
}: {
  day: DiaryDay;
  isToday: boolean;
  past: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const worn = day.entries.some((e) => e.worn);
  const label = isToday ? copy.today : weekdayLong(day.date);
  // Worn: one filled dot. Planned: a ring per look, its fill the cell's own ground.
  const marks = worn ? [{ filled: true }] : day.entries.map(() => ({ filled: false }));
  // Today keeps its fill wherever the selection goes; the day picked is outlined (Felix 3a).
  const ground = isToday ? 'bg-selected' : 'bg-bg';
  const current = isToday || selected;
  const dim = past && !selected;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={copy.strip.day(label, day.entries.length, worn)}
      testID={`diary-day-${day.date}`}
      onPress={onSelect}
      style={{ width: CELL }}
      className={`items-center gap-[5px] rounded-sm border pt-2 pb-[7px] ${ground} ${
        selected ? 'border-selected-line' : 'border-transparent'
      }`}
    >
      <RNText
        maxFontSizeMultiplier={maxFontSizeMultiplier.label}
        className={`uppercase ${current ? 'text-ink-muted' : 'text-ink-faint'}`}
        style={{
          fontFamily: current ? fonts.sansMedium : fonts.sansRegular,
          fontSize: 9,
          letterSpacing: 0.9,
        }}
      >
        {isToday ? copy.today : weekdayShort(day.date)}
      </RNText>
      <RNText
        maxFontSizeMultiplier={maxFontSizeMultiplier.label}
        className={dim ? 'text-ink-faint' : 'text-ink'}
        style={typeStyle('day-number')}
      >
        {Number(day.date.slice(8))}
      </RNText>
      <View className="h-[5px] flex-row pl-0.5" importantForAccessibility="no-hide-descendants">
        {marks.map((m, i) => (
          <View
            // biome-ignore lint/suspicious/noArrayIndexKey: identical marks
            key={i}
            testID={`diary-mark-${day.date}-${i}`}
            // Worn: a solid warm-past dot. Planned: an ink-soft ring on white (the warm fill in the
            // today's cell); a plan left on a past day keeps its ring, never reading as worn.
            className={`-ml-0.5 size-[5px] rounded-pill border ${
              m.filled
                ? 'border-warm-past bg-warm-past'
                : `border-ink-muted ${isToday ? 'bg-selected' : 'bg-surface-raised'}`
            }`}
          />
        ))}
      </View>
    </Pressable>
  );
}
