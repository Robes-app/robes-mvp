import { useApi } from '@robes/api-client/react';
import { plan as copy } from '@robes/copy';
import { monthGrid, monthLabel, shiftMonth } from '@robes/core/calendar';
import { Heading, IconButton, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Month view (M5 task 4): days with looks carry a dot per look; tapping opens the first look.
export function PlanMonth({ today }: { today: string }) {
  const router = useRouter();
  const [month, setMonth] = useState(today.slice(0, 7));
  const grid = monthGrid(month);
  const query = useApi('plan.get', { input: { from: grid.from, days: grid.days } });
  const byDate = new Map(query.data?.days.map((d) => [d.date, d.entries]) ?? []);
  const label = monthLabel(month);
  const rows = Array.from({ length: grid.cells.length / 7 }, (_, r) =>
    grid.cells.slice(r * 7, r * 7 + 7),
  );
  return (
    <ScrollView contentContainerClassName="gap-4 px-6 pb-12" testID="plan-month">
      <View className="flex-row items-center justify-between">
        <IconButton
          icon="back"
          label={copy.prevMonth}
          onPress={() => setMonth(shiftMonth(month, -1))}
        />
        <Heading size="md">{label}</Heading>
        <IconButton
          icon="forward"
          label={copy.nextMonth}
          onPress={() => setMonth(shiftMonth(month, 1))}
        />
      </View>
      {query.isError ? <Text tone="danger">{errorMessage(query.error)}</Text> : null}
      <View className="flex-row" importantForAccessibility="no-hide-descendants">
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
            const entries = byDate.get(date) ?? [];
            const first = entries[0];
            return (
              <Pressable
                key={date}
                testID={`month-day-${date}`}
                accessibilityRole={first ? 'link' : 'text'}
                accessibilityLabel={
                  first ? `${date}: ${entries.map((e) => e.look.name).join(', ')}` : date
                }
                disabled={!first}
                onPress={() => first && router.push(`/look/${first.look.id}`)}
                className={`min-h-14 flex-1 items-center gap-1 rounded-crisp border py-1 ${date === today ? 'border-ink' : 'border-hairline'}`}
              >
                <Text className="text-xs">{Number(date.slice(8))}</Text>
                {entries.length ? (
                  <Text className="text-xs">{'●'.repeat(Math.min(entries.length, 3))}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
