'use client';

import { queryKeys, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { diaryDays } from '@robes/core/calendar';
import { Button, Dialog, Pill, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { dayLabel, formatDay, localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';

// Save opens the diary every time (legacy 0.2): a day is one tap; closing it writes nothing.
export function DiarySheet({ look, onClose }: { look: Look | null; onClose: () => void }) {
  const today = localToday();
  const { days, preset } = diaryDays(today, look?.dateHint);
  const [picked, setPicked] = useState<string | null>(null);
  const day = picked ?? preset;
  const toast = useToast();
  const queryClient = useQueryClient();
  const pin = useApiMutation('plan.pin', {
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
      if (day) toast({ message: copy.addedToDay(formatDay(day)) });
      close();
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const close = () => {
    setPicked(null);
    onClose();
  };
  return (
    <Dialog
      open={look !== null}
      onOpenChange={(o) => {
        if (!o) close();
      }}
      eyebrow={copy.saved}
      title={copy.diary.title}
      description={look?.name}
      footer={
        <>
          <Button variant="quiet" onClick={close}>
            {copy.diary.notYet}
          </Button>
          <Button
            variant="primary"
            disabled={!day}
            loading={pin.isPending}
            onClick={() => {
              if (look && day) {
                pin.mutate({ params: { id: look.id }, input: { dates: [day], slot: 'day' } });
              }
            }}
          >
            {day ? copy.diary.add(dayLabel(day, today)) : copy.diary.pick}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        {days.map((d) => (
          <Pill key={d} selected={d === day} onClick={() => setPicked(d)}>
            {dayLabel(d, today)}
          </Pill>
        ))}
      </div>
    </Dialog>
  );
}
