import { useApi } from '@robes/api-client/react';
import { plan as copy } from '@robes/copy';
import { longDate, monthGrid } from '@robes/core/calendar';
import { fonts, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { DayDots } from './DayDots';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Month view: a numeral and one dot per look in each cell; every cell opens its day.
export function PlanMonth({ today, month }: { today: string; month: string }) {
  const router = useRouter();
  const grid = monthGrid(month);
  const query = useApi('plan.get', { input: { from: grid.from, days: grid.days } });
  const byDate = new Map(query.data?.days.map((d) => [d.date, d.entries.length]) ?? []);
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
            return (
              <Pressable
                key={date}
                testID={`month-day-${date}`}
                accessibilityRole="button"
                accessibilityLabel={copy.week.day(longDate(date), looks)}
                onPress={() => router.push(`/day/${date}`)}
                className={`min-h-14 flex-1 items-center gap-1.5 rounded-crisp border pt-1.5 ${date === today ? 'border-ink' : 'border-hairline'}`}
              >
                <Text className="text-base text-ink" style={{ fontFamily: fonts.displayRegular }}>
                  {Number(date.slice(8))}
                </Text>
                <DayDots looks={looks} past={date <= today} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
