import type { PlanEntry } from '@robes/contracts';
import { plan as copy, nav, ui } from '@robes/copy';
import { daySummary, monthLabel, shiftMonth, weekdayShort, weekGroups } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import {
  Card,
  CardSkeleton,
  EmptyState,
  Eyebrow,
  fonts,
  IconButton,
  MIN_TOUCH,
  SegmentedControl,
  Text,
  useColor,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { TabScreen } from '@/components/TabScreen';
import { errorMessage } from '@/lib/errors';
import { readPref, writePref } from '@/lib/prefs';
import { localDate } from '../looks/saved-looks';
import { LookPicker } from './LookPicker';
import { LookThumb } from './LookThumb';
import { PlanMonth } from './PlanMonth';
import { PLAN_DAYS, usePlan } from './plan';

type View_ = 'list' | 'month';

const VIEW_KEY = 'robes.plan.view';

// List | Month, kept per viewer (D4; web twin app/src/app/(app)/plan/use-plan-view.ts). Null
// until the stored pick is read, so the Diary never fetches the wrong view's days first.
export function usePlanView(): [View_ | null, (next: View_) => void] {
  const [view, setView] = useState<View_ | null>(null);
  useEffect(() => {
    let live = true;
    void readPref(VIEW_KEY).then((stored) => {
      if (live) setView((v) => v ?? (stored === 'month' ? 'month' : 'list'));
    });
    return () => {
      live = false;
    };
  }, []);
  return [
    view,
    (next) => {
      setView(next);
      void writePref(VIEW_KEY, next);
    },
  ];
}

// The month's ‹ ›: small labelled circles on the fine edge (the label is the cue).
function MonthStep({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: 'back' | 'forward';
  onPress: () => void;
}) {
  const ink = useColor('ink');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={(MIN_TOUCH - 32) / 2}
      style={{ width: 32, height: 32 }}
      className="items-center justify-center rounded-pill border border-rule-mid bg-surface-raised"
    >
      <Icon name={icon} size={14} color={ink} />
    </Pressable>
  );
}

// The Diary tab (beta parity canvas, 04 Diary): the List | Month track and the + pinned under
// the header; the eyebrow names the window, or the month with its ‹ › on Month.
export function PlanView() {
  const [stored, setView] = usePlanView();
  const view = stored ?? 'list';
  const { data } = usePlan();
  const today = data?.from ?? localDate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [picking, setPicking] = useState(false);
  return (
    <TabScreen
      title={nav.plan}
      toolbar={
        <View className="flex-row items-center justify-between gap-4">
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
          <IconButton framed icon="plus" label={copy.header.add} onPress={() => setPicking(true)} />
        </View>
      }
    >
      <View className="mt-[22px] mb-3 min-h-8 flex-row items-center justify-between px-5">
        <Eyebrow accessibilityRole="header">
          {view === 'list' ? copy.header.window(PLAN_DAYS) : monthLabel(month)}
        </Eyebrow>
        {view === 'month' ? (
          <View className="flex-row gap-2">
            <MonthStep
              label={copy.prevMonth}
              icon="back"
              onPress={() => setMonth(shiftMonth(month, -1))}
            />
            <MonthStep
              label={copy.nextMonth}
              icon="forward"
              onPress={() => setMonth(shiftMonth(month, 1))}
            />
          </View>
        ) : null}
      </View>
      {stored === null ? null : view === 'list' ? (
        <PlanList />
      ) : (
        <PlanMonth today={today} month={month} />
      )}
      <LookPicker date={picking ? today : null} onClose={() => setPicking(false)} />
    </TabScreen>
  );
}

// One row of a week card: the weekday over its numeral, the look's photograph when one is on
// the day, her name for it (or the faint invitation) and what it holds. Today carries the rose
// rule and label, and the one full-ink numeral.
function DayRow({
  date,
  today,
  name,
  entries,
  first,
}: {
  date: string;
  today: string;
  name: string | null;
  entries: PlanEntry[];
  first: boolean;
}) {
  const router = useRouter();
  const muted = useColor('ink-muted');
  const isToday = date === today;
  const s = daySummary(entries, name);
  const title = s.name ?? (s.looks ? copy.list.looks(s.looks) : null);
  const label = isToday ? copy.today : weekdayShort(date);
  // A wear on the day (its record, not the look's last wear) reads after the count (D2).
  const worn = entries.some((e) => e.worn);
  // Up to two looks' photographs, overlapping (legacy .dy-r-th).
  const thumbs = entries.slice(0, 2);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${copy.list.open(`${label} ${Number(date.slice(8))}`)}${title ? `: ${title}` : ''}`}
      onPress={() => router.push(`/day/${date}`)}
      testID={`plan-day-${date}`}
      // Twin: plan-list.tsx (legacy .dy-r).
      className={`min-h-14 flex-row items-center gap-[14px] py-3 pr-[14px] ${first ? '' : 'border-t border-hairline'} ${
        isToday ? 'border-l-[3px] border-l-accent-inspire pl-[13px]' : 'pl-4'
      }`}
    >
      <View className="w-[34px] items-center">
        <Text
          className={`text-[9px] uppercase ${isToday ? 'text-accent-warm' : 'text-ink-faint'}`}
          style={{ fontFamily: fonts.sansRegular, letterSpacing: 1.26 }}
        >
          {label}
        </Text>
        <Text
          className="mt-1 text-ink"
          style={{ fontFamily: fonts.displayRegular, fontSize: 22, lineHeight: 24 }}
        >
          {Number(date.slice(8))}
        </Text>
      </View>
      {thumbs.length ? (
        <View className="flex-row">
          {thumbs.map((e, i) => (
            <View
              key={e.look.id}
              className="rounded-[5px] border-[1.5px] border-surface-raised"
              style={i ? { marginLeft: -12 } : undefined}
            >
              <LookThumb look={e.look} width={31} />
            </View>
          ))}
        </View>
      ) : null}
      <View className="flex-1 gap-px">
        <Text
          numberOfLines={1}
          className={title ? 'text-ink' : 'text-ink-faint'}
          style={{ fontFamily: title ? fonts.displayRegular : fonts.displayItalic, fontSize: 18 }}
        >
          {title ?? copy.list.nameTheDay}
        </Text>
        {s.looks ? (
          <Text
            numberOfLines={1}
            className="text-[11px] text-ink-faint"
            style={{ fontFamily: fonts.sansRegular }}
          >
            {copy.list.looks(s.looks)}
            {s.pieces ? ` · ${copy.list.pieces(s.pieces)}` : ''}
            {worn ? (
              <>
                {' · '}
                <Text
                  className="text-[11px] text-ink-muted"
                  style={{ fontFamily: fonts.sansRegular }}
                >
                  {copy.list.worn}
                </Text>
              </>
            ) : null}
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
      <View className="gap-3 px-5" accessibilityState={{ busy: true }}>
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
  const planned = data.days.some((d) => d.entries.length > 0 || d.name);
  return (
    <ScrollView
      testID="plan-list"
      contentContainerClassName="gap-3 px-5 pb-12"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      {planned ? null : (
        <EmptyState title={copy.empty.title} titleEm={copy.empty.titleEm} body={copy.empty.body} />
      )}
      {weekGroups(data.days, data.from).map((g) => (
        // A week is one white card: its range (or "Rest of this week") then a row per day.
        <Card key={g.monday}>
          <Text
            className="border-b border-hairline px-4 pt-3 pb-2.5 text-[9.5px] text-ink-faint uppercase"
            style={{ fontFamily: fonts.sansRegular, letterSpacing: 1.9 }}
            accessibilityRole="header"
          >
            {g.range ?? (g.wholeWeek ? copy.list.thisWeek : copy.list.restOfWeek)}
          </Text>
          {g.days.map((day, i) => (
            <DayRow
              key={day.date}
              date={day.date}
              today={data.from}
              name={day.name}
              entries={day.entries}
              first={i === 0}
            />
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}
