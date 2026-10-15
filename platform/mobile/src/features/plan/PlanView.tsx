import type { PlanEntry } from '@robes/contracts';
import { plan as copy, ui } from '@robes/copy';
import { daySummary, monthLabel, shiftMonth, weekdayShort, weekGroups } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import {
  CardSkeleton,
  EmptyState,
  fonts,
  MIN_TOUCH,
  SegmentedControl,
  Text,
  useColor,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { localDate } from '../looks/saved-looks';
import { LookPicker } from './LookPicker';
import { LookThumb } from './LookThumb';
import { PlanMonth } from './PlanMonth';
import { PLAN_DAYS, usePlan } from './plan';

type View_ = 'list' | 'month';

function Circle({
  label,
  icon,
  size,
  onPress,
}: {
  label: string;
  icon: 'plus' | 'back' | 'forward';
  size: 36 | 32;
  onPress: () => void;
}) {
  const ink = useColor('ink');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={(MIN_TOUCH - size) / 2}
      style={{ width: size, height: size }}
      className={`items-center justify-center rounded-pill border ${size === 36 ? 'border-border-control' : 'border-hairline'}`}
    >
      <Icon name={icon} size={size === 36 ? 16 : 14} color={ink} />
    </Pressable>
  );
}

// The Plan (legacy Diary) head is the shared anatomy (809b13e): the List | Month track and the +
// on row 1; row 2 is the eyebrow alone, with ‹ › at its right on Month.
export function PlanView() {
  const [view, setView] = useState<View_>('list');
  const { data } = usePlan();
  const today = data?.from ?? localDate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [picking, setPicking] = useState(false);
  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between gap-4 px-6 pt-2">
        <SegmentedControl<View_>
          label={copy.view.label}
          options={[
            { value: 'list', label: copy.view.list },
            { value: 'month', label: copy.view.month },
          ]}
          value={view}
          onChange={setView}
        />
        {/* The trip is hidden, so the + adds a look straight away (legacy 2eacfb4). */}
        <Circle label={copy.header.add} icon="plus" size={36} onPress={() => setPicking(true)} />
      </View>
      <View className="mt-5 mb-3 h-8 flex-row items-center justify-between px-6">
        <Text
          className="text-[10px] text-ink-faint uppercase"
          style={{ fontFamily: fonts.sans, letterSpacing: 2.4 }}
        >
          {view === 'list' ? copy.header.window(PLAN_DAYS) : monthLabel(month)}
        </Text>
        {view === 'month' ? (
          <View className="flex-row gap-2">
            <Circle
              label={copy.prevMonth}
              icon="back"
              size={32}
              onPress={() => setMonth(shiftMonth(month, -1))}
            />
            <Circle
              label={copy.nextMonth}
              icon="forward"
              size={32}
              onPress={() => setMonth(shiftMonth(month, 1))}
            />
          </View>
        ) : null}
      </View>
      {view === 'list' ? <PlanList /> : <PlanMonth today={today} month={month} />}
      <LookPicker date={picking ? today : null} onClose={() => setPicking(false)} />
    </View>
  );
}

function DayRow({ date, today, entries }: { date: string; today: string; entries: PlanEntry[] }) {
  const router = useRouter();
  const muted = useColor('ink-muted');
  const isToday = date === today;
  const s = daySummary(entries);
  const title = s.name ?? (s.looks ? copy.list.looks(s.looks) : null);
  const label = isToday ? copy.today : weekdayShort(date);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${copy.list.open(`${label} ${Number(date.slice(8))}`)}${title ? `: ${title}` : ''}`}
      onPress={() => router.push(`/day/${date}`)}
      testID={`plan-day-${date}`}
      className="min-h-16 flex-row items-center gap-3 border-b border-hairline py-3"
    >
      <View className="w-11 items-center">
        <Text
          className={`text-[9px] uppercase ${isToday ? 'text-accent-warm' : 'text-ink-faint'}`}
          style={{ fontFamily: fonts.sans, letterSpacing: 1.6 }}
        >
          {label}
        </Text>
        <Text className="text-2xl text-ink" style={{ fontFamily: fonts.displayRegular }}>
          {Number(date.slice(8))}
        </Text>
      </View>
      {entries.length ? (
        <View className="flex-row">
          {entries.slice(0, 2).map((e, i) => (
            <View key={e.id} style={i ? { marginLeft: -12 } : undefined}>
              <LookThumb look={e.look} width={34} />
            </View>
          ))}
        </View>
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className={`text-lg ${title ? 'text-ink' : 'text-ink-faint italic'}`}
          style={{ fontFamily: fonts.displayRegular }}
        >
          {title ?? copy.list.nameTheDay}
        </Text>
        {s.looks ? (
          <Text size="caption" tone="muted">
            {copy.list.looks(s.looks)}
            {s.pieces ? ` · ${copy.list.pieces(s.pieces)}` : ''}
          </Text>
        ) : null}
      </View>
      <Icon name="forward" size={16} color={muted} />
    </Pressable>
  );
}

// The rolling 30 days as summary rows grouped by week (legacy ff87e89): every row opens its day.
export function PlanList() {
  const { data, isPending, isError, error, refetch, isRefetching } = usePlan();
  if (isPending) {
    return (
      <View className="gap-3 px-6" accessibilityState={{ busy: true }}>
        <CardSkeleton />
        <CardSkeleton />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <EmptyState
        title={errorMessage(error)}
        action={{ label: ui.retry, onPress: () => void refetch() }}
      />
    );
  }
  const planned = data.days.some((d) => d.entries.length > 0);
  return (
    <ScrollView
      testID="plan-list"
      contentContainerClassName="gap-6 px-6 pb-12"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      {planned ? null : <EmptyState title={copy.empty.title} body={copy.empty.body} />}
      {weekGroups(data.days, data.from).map((g) => (
        <View key={g.monday}>
          <Text
            className="mb-2 text-[10px] text-ink-faint uppercase"
            style={{ fontFamily: fonts.sans, letterSpacing: 2.4 }}
            accessibilityRole="header"
          >
            {g.range ?? (g.wholeWeek ? copy.list.thisWeek : copy.list.restOfWeek)}
          </Text>
          {g.days.map((day) => (
            <DayRow key={day.date} date={day.date} today={data.from} entries={day.entries} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
