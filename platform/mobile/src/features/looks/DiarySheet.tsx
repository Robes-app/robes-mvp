import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import {
  diaryPick,
  longDate,
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
} from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import { Button, PrimaryScope, Sheet, Text, useColor, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { dayLabel, usePinLook } from '@/features/plan/plan';
import { errorMessage } from '@/lib/errors';
import { LookPhoto } from './LookTile';
import { localDate } from './saved-looks';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

// Save opens the diary every time (legacy 0.2): beta's month, any day one tap, a day gone by
// records it as worn, and "I wore this today" beneath. Closing it writes nothing.
export function DiarySheet({ look, onClose }: { look: Look | null; onClose: () => void }) {
  const today = localDate();
  const [month, setMonth] = useState(() => monthOf(look?.dateHint ?? today));
  const [picked, setPicked] = useState<string | null>(null);
  const day = picked ?? look?.dateHint ?? today;
  const toast = useToast();
  const queryClient = useQueryClient();
  const pin = usePinLook();
  const rose = useColor('accent-inspire');
  const ink = useColor('ink');
  const muted = useColor('ink-muted');

  const grid = monthGrid(month);
  const plan = useApi(
    'plan.get',
    { input: { from: grid.from, days: grid.days } },
    { enabled: look !== null },
  );
  const days = plan.data?.days ?? [];
  const filled = new Set(days.filter((d) => d.entries.length > 0).map((d) => d.date));
  const pins = new Set(
    days.filter((d) => d.entries.some((e) => e.look.id === look?.id)).map((d) => d.date),
  );
  const worn = new Set(look?.lastWornOn ? [look.lastWornOn] : []);
  for (const d of worn) filled.add(d);

  const state = diaryPick(day, today, {
    pinned: pins.has(day),
    worn: worn.has(day),
    filed: filled.has(day),
  });

  const close = () => {
    setPicked(null);
    onClose();
  };
  const settle = (message: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    // The look's own page reads the count and the record of days: both follow a wear.
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.wears') });
    toast.show({ message });
    close();
  };
  const wear = useApiMutation('looks.wear', {
    onSuccess: (w) => settle(copy.diary.recordedOn(dayLabel(w.wornOn))),
    onError: (err: unknown) => toast.show({ message: errorMessage(err) }),
  });
  const busy = pin.isPending || wear.isPending;

  const act = () => {
    if (!look || state.action === 'recorded') return;
    if (state.action === 'record' || state.action === 'already') {
      // A day already carrying this look needs no second pin; a day gone by records the wear.
      if (state.action === 'record')
        wear.mutate({ params: { id: look.id }, input: { wornOn: day } });
      else close();
      return;
    }
    pin.mutateAsync({ params: { id: look.id }, input: { dates: [day], slot: 'day' } }).then(
      () => settle(copy.diary.inDiaryFor(look.name, dayLabel(day))),
      (err: unknown) => toast.show({ message: errorMessage(err) }),
    );
  };

  const rows = Array.from({ length: grid.cells.length / 7 }, (_, r) =>
    grid.cells.slice(r * 7, r * 7 + 7),
  );
  return (
    <Sheet
      open={look !== null}
      onClose={close}
      eyebrow={copy.diary.eyebrow}
      title={look?.name || copy.diary.title}
      {...(look
        ? {
            media: (
              <View style={{ width: 56 }} className="overflow-hidden rounded-crisp">
                <LookPhoto look={look} width={56} />
              </View>
            ),
          }
        : {})}
      closeButton
      testID="diary-sheet"
    >
      <PrimaryScope>
        <View className="gap-4 pb-6">
          {/* Beta's month sits on a white card (twin: diary-sheet.tsx). */}
          <View className="gap-3 rounded-soft border border-hairline bg-surface-raised p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-lg">{monthLabel(month)}</Text>
              {/* ‹ › in 22pt hairline circles, each a 44pt target (web twin diary-sheet.tsx). */}
              <View className="flex-row items-center gap-2">
                {(
                  [
                    ['back', copy.diary.prevMonth, -1],
                    ['forward', copy.diary.nextMonth, 1],
                  ] as const
                ).map(([icon, label, by]) => (
                  <Pressable
                    key={icon}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    onPress={() => setMonth(shiftMonth(month, by))}
                    hitSlop={11}
                    className="h-[22px] w-[22px] items-center justify-center rounded-pill border border-rule-mid"
                  >
                    <Icon name={icon} size={12} color={muted} />
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="gap-1">
              <View className="flex-row" importantForAccessibility="no-hide-descendants">
                {WEEKDAYS.map((k, i) => (
                  <Text
                    key={k}
                    tone="muted"
                    size="caption"
                    className="flex-1 text-center uppercase"
                    style={{ fontSize: 9.5, letterSpacing: 1.7 }}
                  >
                    {copy.diary.weekdays[i]}
                  </Text>
                ))}
              </View>
              {rows.map((row, r) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: rows of a fixed grid
                <View key={r} className="flex-row gap-1">
                  {row.map((date, c) => {
                    // biome-ignore lint/suspicious/noArrayIndexKey: padding cells are fixed positions
                    if (!date) return <View key={`pad-${r}-${c}`} className="flex-1" />;
                    const on = date === day;
                    return (
                      <Pressable
                        key={date}
                        accessibilityRole="button"
                        accessibilityLabel={longDate(date)}
                        accessibilityState={{ selected: on }}
                        onPress={() => setPicked(date)}
                        className="min-h-11 flex-1 items-center justify-center gap-0.5"
                      >
                        {/* The picked day is a warm circle; today carries no ring of its own. */}
                        <View
                          className={`h-8 w-8 items-center justify-center rounded-full border ${
                            on ? 'border-selected-line bg-selected' : 'border-transparent'
                          }`}
                        >
                          <Text
                            className="font-display text-base"
                            style={{ color: on || date === today ? ink : muted }}
                          >
                            {Number(date.slice(8))}
                          </Text>
                        </View>
                        {/* A filed day carries a dot, so her diary reads at a glance. */}
                        <View
                          className="size-1 rounded-pill"
                          style={filled.has(date) ? { backgroundColor: rose } : undefined}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
          <Text
            tone="muted"
            italic
            accessibilityLiveRegion="polite"
            className="border-t border-hairline pt-3 text-center"
          >
            {copy.diary.picked(longDate(day), day === today, state.suffix)}
          </Text>
          <Button disabled={state.action === 'recorded'} loading={busy} onPress={act}>
            {copy.diary[state.action]}
          </Button>
          {/* Beta's order: the day's act, then "I wore this today" on every day — it is how a wear
              is logged now the look page carries no wear buttons; once today is logged the link goes
              (the calendar's dot says it). × closes; no "Not yet" (27 Oct). */}
          {worn.has(today) ? null : (
            <Button
              variant="quiet"
              disabled={busy}
              onPress={() => {
                if (look) wear.mutate({ params: { id: look.id }, input: { wornOn: today } });
              }}
            >
              {copy.diary.woreToday}
            </Button>
          )}
        </View>
      </PrimaryScope>
    </Sheet>
  );
}
