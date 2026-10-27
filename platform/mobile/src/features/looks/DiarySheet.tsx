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
import {
  Button,
  IconButton,
  PrimaryScope,
  Sheet,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
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
      testID="diary-sheet"
    >
      <PrimaryScope>
        <View className="gap-4 pb-6">
          {/* Beta's month sits on a white card (twin: diary-sheet.tsx). */}
          <View className="gap-3 rounded-soft border border-hairline bg-surface-raised p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-lg">{monthLabel(month)}</Text>
              <View className="flex-row items-center gap-1">
                <IconButton
                  icon="back"
                  label={copy.diary.prevMonth}
                  onPress={() => setMonth(shiftMonth(month, -1))}
                />
                <IconButton
                  icon="forward"
                  label={copy.diary.nextMonth}
                  onPress={() => setMonth(shiftMonth(month, 1))}
                />
              </View>
            </View>
            <View className="gap-1">
              <View className="flex-row" importantForAccessibility="no-hide-descendants">
                {WEEKDAYS.map((k, i) => (
                  <Text key={k} tone="muted" size="caption" className="flex-1 text-center">
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
                        className={`min-h-11 flex-1 items-center justify-center gap-1 rounded-soft border ${
                          on
                            ? 'border-selected-line bg-selected'
                            : date === today
                              ? 'border-hairline'
                              : 'border-transparent'
                        }`}
                      >
                        <Text size="small" tone={date < today ? 'muted' : 'ink'}>
                          {Number(date.slice(8))}
                        </Text>
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
          {/* Beta's order: the day's act, "I wore this today" beneath it, then not yet. */}
          <Button disabled={state.action === 'recorded'} loading={busy} onPress={act}>
            {copy.diary[state.action]}
          </Button>
          {worn.has(today) ? (
            <View className="flex-row items-center justify-center gap-1.5">
              <Icon name="check" size={14} color={rose} />
              <Text size="small" tone="muted">
                {copy.diary.woreTodayDone}
              </Text>
            </View>
          ) : (
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
          <Button variant="quiet" onPress={close}>
            {copy.diary.notYet}
          </Button>
        </View>
      </PrimaryScope>
    </Sheet>
  );
}
