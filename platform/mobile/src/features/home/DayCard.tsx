import { useApi, useApiClient } from '@robes/api-client/react';
import type { DiaryDay, PlanEntry } from '@robes/contracts';
import { diary as copy, ui } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { LookPicker } from '@/features/plan/LookPicker';
import { errorMessage } from '@/lib/errors';
import { DaySlot } from './DaySlot';
import { type DayOrigin, setDayOrigin } from './day-origin';
import { dayWordOf, type PickerMode } from './diary';
import { ModelPicker } from './ModelPicker';

// A day and every way into and onto its looks (Felix 3a · 3k; design "Diary & Day", 14 Nov): the
// day's slot with the camera, the model picker and the look drawer behind its discs. Home's
// selected day and the Diary's day screen are this one card, so a flow changed here changes on
// both. The web twin is app/src/components/home/day-card.tsx.
export function DayCard({
  day,
  today,
  origin,
  justSaved = null,
  room = null,
  forget,
  refresh,
}: {
  day: DiaryDay;
  today: string;
  // The screen this day is on: a look made for the day comes back to it.
  origin: DayOrigin;
  // The look just saved from its draft: its page says so for the visit.
  justSaved?: string | null;
  // The height the slot may take before Home would scroll (DiaryHome measures it).
  room?: number | null;
  // Takes a look off the day in the caller's cache at once; the server read follows.
  forget: (entryId: string) => void;
  refresh: () => void;
}) {
  const api = useApiClient();
  const toast = useToast();
  const router = useRouter();
  // The model her looks stand on: the photograph on the day's last page, and the picker's ticks.
  const model = useApi('me.model.get');
  const [choosing, setChoosing] = useState(false);
  const [drawer, setDrawer] = useState<PickerMode | null>(null);
  // Home's tab stays mounted under the Diary's day, so the origin follows the screen in focus.
  useFocusEffect(useCallback(() => setDayOrigin(origin), [origin]));
  const date = day.date;
  const past = date < today;

  // × on a look: a planned look is unpinned, a worn one has its wear taken back; both undo.
  const remove = (entry: PlanEntry) => {
    forget(entry.id);
    const call = entry.worn
      ? api.call('looks.unwear', { params: { id: entry.look.id, date } })
      : api.call('plan.unpin', { params: { id: entry.id } });
    void call
      .then(() =>
        toast.show({
          message: copy.slot.removed,
          action: {
            label: ui.undo,
            onPress: () =>
              void (
                entry.worn
                  ? api.call('looks.wear', {
                      params: { id: entry.look.id },
                      input: { wornOn: date },
                    })
                  : api.call('plan.restore', { params: { id: entry.id } })
              )
                .then(refresh)
                .catch((err) => toast.show({ message: errorMessage(err) })),
          },
        }),
      )
      .catch((err) => toast.show({ message: errorMessage(err) }))
      .finally(refresh);
  };

  return (
    <>
      <DaySlot
        room={room}
        day={day}
        today={today}
        dayWord={dayWordOf(date, today)}
        justSaved={justSaved}
        model={model.data}
        actions={{
          // Capture opens the camera for the day (Capture PRD 1c): Use photo makes its draft.
          onCapture: () => router.push({ pathname: '/looks/photo', params: { day: date } }),
          // Create opens the Draft look sheet for the day (Felix 3a, D22): today and ahead only.
          onDescribe: past ? null : () => router.push(`/looks/draft/new?day=${date}`),
          onPick: () => setDrawer('add'),
          onSwap: () => setDrawer('change'),
          onEdit: (entry) => router.push(`/looks/draft/${entry.look.id}?day=${date}`),
          onRemove: remove,
          onModel: () => setChoosing(true),
        }}
      />
      <ModelPicker open={choosing} model={model.data} onClose={() => setChoosing(false)} />
      <LookPicker
        date={drawer ? date : null}
        today={today}
        mode={drawer ?? 'add'}
        onClose={() => setDrawer(null)}
        onChanged={refresh}
      />
    </>
  );
}
