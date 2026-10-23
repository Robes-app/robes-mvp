import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { diaryDays } from '@robes/core/calendar';
import { Button, Chip, PrimaryScope, Sheet, Text, useToast } from '@robes/ui-native';
import { useState } from 'react';
import { View } from 'react-native';
import { dayLabel, usePinLook } from '@/features/plan/plan';
import { errorMessage } from '@/lib/errors';
import { localDate } from './saved-looks';

// Save opens the diary every time (legacy 0.2): a day is one tap; closing it writes nothing.
export function DiarySheet({ look, onClose }: { look: Look | null; onClose: () => void }) {
  const today = localDate();
  const { days, preset } = diaryDays(today, look?.dateHint);
  const [picked, setPicked] = useState<string | null>(null);
  const day = picked ?? preset;
  const toast = useToast();
  const pin = usePinLook();
  const close = () => {
    setPicked(null);
    onClose();
  };
  return (
    <Sheet
      open={look !== null}
      onClose={close}
      eyebrow={copy.saved}
      title={copy.diary.title}
      testID="diary-sheet"
    >
      <PrimaryScope>
        <View className="gap-4 pb-6">
          {look ? <Text tone="muted">{look.name}</Text> : null}
          <View className="flex-row flex-wrap gap-2">
            {days.map((d) => (
              <Chip key={d} selected={d === day} onPress={() => setPicked(d)}>
                {dayLabel(d, today)}
              </Chip>
            ))}
          </View>
          <View className="flex-row gap-3">
            <Button variant="quiet" onPress={close} className="flex-1">
              {copy.diary.notYet}
            </Button>
            <Button
              disabled={!day}
              loading={pin.isPending}
              className="flex-1"
              onPress={() => {
                if (!look || !day) return;
                pin
                  .mutateAsync({ params: { id: look.id }, input: { dates: [day], slot: 'day' } })
                  .then(
                    () => {
                      toast.show({ message: copy.addedToDay(dayLabel(day)) });
                      close();
                    },
                    (err: unknown) => toast.show({ message: errorMessage(err) }),
                  );
              }}
            >
              {day ? copy.diary.add(dayLabel(day, today)) : copy.diary.pick}
            </Button>
          </View>
        </View>
      </PrimaryScope>
    </Sheet>
  );
}
