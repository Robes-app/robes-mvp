import { useApi } from '@robes/api-client/react';
import { plan as copy } from '@robes/copy';
import { longDate, monthGrid, rangeLabel, tripBands } from '@robes/core/calendar';
import { fonts, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { useFeatures } from '@/lib/features';
import { DayDots } from './DayDots';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Month view: a numeral and one dot per look in each cell; every cell opens its day.
export function PlanMonth({ today, month }: { today: string; month: string }) {
  const router = useRouter();
  const grid = monthGrid(month);
  const query = useApi('plan.get', { input: { from: grid.from, days: grid.days } });
  const byDate = new Map(query.data?.days.map((d) => [d.date, d.entries.length]) ?? []);
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
    <ScrollView contentContainerClassName="gap-1 px-6 pb-12" testID="plan-month">
      {query.isError ? <Text tone="danger">{errorMessage(query.error)}</Text> : null}
      <View className="mb-1 flex-row" importantForAccessibility="no-hide-descendants">
        {WEEKDAYS.map((d, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed weekday header
          <Text key={i} tone="muted" className="flex-1 text-center text-xs">
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
            return (
              <Pressable
                key={date}
                testID={`month-day-${date}`}
                accessibilityRole="button"
                accessibilityLabel={copy.week.day(longDate(date), looks)}
                onPress={() => router.push(`/day/${date}`)}
                className={`min-h-14 flex-1 items-center gap-1.5 rounded-crisp border pt-1.5 ${
                  date === today ? 'border-ink' : band ? 'border-transparent' : 'border-hairline'
                }`}
              >
                {/* The phone's trip band is the whole tile, bridging the gutters (11337c3). */}
                {band ? (
                  <View
                    className={`absolute top-0 bottom-0 bg-accent-decor ${band.first ? 'rounded-l-crisp' : ''} ${band.last ? 'rounded-r-crisp' : ''}`}
                    style={{ left: band.first ? 0 : -2, right: band.last ? 0 : -2 }}
                  />
                ) : null}
                <Text className="text-base text-ink" style={{ fontFamily: fonts.displayRegular }}>
                  {Number(date.slice(8))}
                </Text>
                <DayDots looks={looks} past={date <= today} />
              </Pressable>
            );
          })}
        </View>
      ))}
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
                className="flex-row items-center gap-3 rounded-crisp border border-hairline p-3"
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
