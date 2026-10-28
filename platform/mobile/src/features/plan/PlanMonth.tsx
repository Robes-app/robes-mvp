import { useApi } from '@robes/api-client/react';
import { plan as copy } from '@robes/copy';
import { longDate, monthGrid, rangeLabel, tripBands, WEEKDAYS_SHORT } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import { ErrorText, fonts, MIN_TOUCH, Text, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { useFeatures } from '@/lib/features';
import { DayDots } from './DayDots';

// Month view: a numeral and one dot per look in each cell; every cell opens its day.
export function PlanMonth({ today, month }: { today: string; month: string }) {
  const router = useRouter();
  const faint = useColor('ink-faint');
  const grid = monthGrid(month);
  const query = useApi('plan.get', { input: { from: grid.from, days: grid.days } });
  const byDate = new Map(query.data?.days.map((d) => [d.date, d.entries.length]) ?? []);
  const dayName = new Map(query.data?.days.map((d) => [d.date, d.name]) ?? []);
  // Trips draw only while the trip is live (hidden at launch, legacy 2eacfb4).
  const { features } = useFeatures();
  const trips = useApi('trips.list', undefined, { enabled: features.trips });
  const inMonth = (trips.data?.items ?? []).filter(
    (t) => t.dateTo >= grid.from && t.dateFrom.slice(0, 7) <= month,
  );
  const bands = tripBands(inMonth, grid.cells);
  const rows = Array.from({ length: grid.cells.length / 7 }, (_, r) =>
    grid.cells.slice(r * 7, r * 7 + 7),
  );
  return (
    <ScrollView contentContainerClassName="gap-1 px-5 pb-12" testID="plan-month">
      {query.isError ? <ErrorText>{errorMessage(query.error)}</ErrorText> : null}
      <View className="mb-1 flex-row" importantForAccessibility="no-hide-descendants">
        {/* Beta's heads, Mon to Sun, from the one table (twin: plan-month.tsx). */}
        {WEEKDAYS_SHORT.map((d) => (
          <Text
            key={d}
            className="flex-1 text-center text-[9px] text-ink-faint uppercase"
            style={{ fontFamily: fonts.sansRegular, letterSpacing: 1.26 }}
          >
            {d}
          </Text>
        ))}
      </View>
      {rows.map((row, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows of a fixed grid
        <View key={r} className="flex-row gap-1">
          {row.map((date, c) => {
            // biome-ignore lint/suspicious/noArrayIndexKey: padding cells are fixed grid positions
            if (!date) return <View key={`pad-${r}-${c}`} className="flex-1" />;
            const looks = byDate.get(date) ?? 0;
            const band = bands.get(date);
            // Beta's month (twin: plan-month.tsx): a past day on cream behind a hairline, a day
            // ahead with nothing on it dashed, a day ahead with looks white on a hairline. A
            // trip's mauve band is the tile itself.
            const isToday = date === today;
            const past = date < today;
            const named = !!dayName.get(date);
            const state = band
              ? 'border-transparent'
              : past
                ? 'border-hairline bg-surface'
                : looks || named
                  ? 'border-hairline bg-surface-raised'
                  : 'border-dashed border-rule-mid';
            return (
              <Pressable
                key={date}
                testID={`month-day-${date}`}
                accessibilityRole="button"
                accessibilityLabel={copy.week.day(longDate(date), looks)}
                onPress={() => router.push(`/day/${date}`)}
                style={{ aspectRatio: 1, minHeight: MIN_TOUCH }}
                className={`flex-1 items-start gap-1 overflow-hidden rounded-soft border p-1.5 ${state}`}
              >
                {/* The phone's trip band is the whole tile, bridging the gutters (11337c3). */}
                {band ? (
                  <View
                    className={`absolute top-0 bottom-0 bg-accent-decor ${band.first ? 'rounded-l-crisp' : ''} ${band.last ? 'rounded-r-crisp' : ''}`}
                    style={{ left: band.first ? 0 : -2, right: band.last ? 0 : -2 }}
                  />
                ) : null}
                <View className="flex-row items-center gap-1">
                  <Text
                    className={isToday ? 'text-ink' : 'text-ink-faint'}
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 17,
                      lineHeight: 18,
                    }}
                  >
                    {Number(date.slice(8))}
                  </Text>
                  {isToday ? <View className="size-1 rounded-pill bg-ink" /> : null}
                </View>
                <View className="mt-auto">
                  <DayDots looks={looks} past={date <= today} />
                </View>
                {/* An empty day still ahead carries a faint + : the cell is the door. */}
                {!past && !looks && !named && !band ? (
                  <View className="absolute bottom-1.5 left-1.5">
                    <Icon name="plus" size={10} color={faint} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
      <Text size="small" tone="muted" className="pt-3 text-center">
        {copy.monthCaption}
      </Text>
      {inMonth.length ? (
        <View className="gap-2 pt-4" accessibilityLabel={copy.trips}>
          {inMonth.map((t) => {
            const days =
              Math.round((Date.parse(t.dateTo) - Date.parse(t.dateFrom)) / 86_400_000) + 1;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityLabel={`${t.destination}, ${copy.tripLine(rangeLabel(t.dateFrom, t.dateTo), days)}`}
                onPress={() => router.push(`/trip/${t.id}`)}
                className="flex-row items-center gap-3 rounded-soft border border-hairline bg-surface-raised p-3"
              >
                <View className="size-11 items-center justify-center rounded-crisp bg-accent-decor">
                  <Text className="text-lg text-ink" style={{ fontFamily: fonts.displayRegular }}>
                    {Number(t.dateFrom.slice(8))}
                  </Text>
                </View>
                <View>
                  <Text className="text-lg text-ink" style={{ fontFamily: fonts.displayRegular }}>
                    {t.destination}
                  </Text>
                  <Text size="caption" tone="muted">
                    {copy.tripLine(rangeLabel(t.dateFrom, t.dateTo), days)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}
