'use client';

import { useApi, useApiClient } from '@robes/api-client/react';
import type { DiaryDay, PlanEntry } from '@robes/contracts';
import { diary as copy, wardrobe } from '@robes/copy';
import { useToast } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LookPicker } from '@/app/(app)/plan/look-picker';
import { LookCapture } from '@/components/capture/look-capture';
import { dayWordOf, type PickerMode } from '@/lib/diary';
import { errorCopy } from '@/lib/error-copy';
import { DaySlot } from './day-slot';
import { ModelPicker } from './model-picker';

// A day and every way into and onto its looks (Felix 3a · 3k; design "Diary & Day", 14 Nov): the
// day's slot with the camera, the model picker and the look drawer behind its discs. Home's
// selected day and the Diary's day page are this one card, so a flow changed here changes on
// both. The native twin is mobile/src/features/home/DayCard.tsx.
export function DayCard({
  day,
  today,
  justSaved = null,
  forget,
  refresh,
}: {
  day: DiaryDay;
  today: string;
  // The look just saved from its draft: its page says so for the visit.
  justSaved?: string | null;
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
  const [capturing, setCapturing] = useState(false);
  const [drawer, setDrawer] = useState<PickerMode | null>(null);
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
        toast({
          message: copy.slot.removed,
          action: {
            label: wardrobe.undo,
            onAction: () =>
              void (
                entry.worn
                  ? api.call('looks.wear', {
                      params: { id: entry.look.id },
                      input: { wornOn: date },
                    })
                  : api.call('plan.restore', { params: { id: entry.id } })
              )
                .then(refresh)
                .catch((err) => toast({ message: errorCopy(err) })),
          },
        }),
      )
      .catch((err) => toast({ message: errorCopy(err) }))
      .finally(refresh);
  };

  return (
    <>
      <DaySlot
        day={day}
        today={today}
        dayWord={dayWordOf(date, today)}
        justSaved={justSaved}
        model={model.data}
        actions={{
          // Capture opens the camera over the day (Capture PRD 1c): Use photo makes its draft.
          onCapture: () => setCapturing(true),
          // Create opens the Draft look drawer for the day (Felix 3a, D22): today and ahead only.
          onDescribe: past ? null : () => router.push(`/looks/draft/new?day=${date}`),
          onPick: () => setDrawer('add'),
          onSwap: () => setDrawer('change'),
          onRemove: remove,
          onModel: () => setChoosing(true),
        }}
      />
      <LookCapture open={capturing} day={date} onClose={() => setCapturing(false)} />
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
