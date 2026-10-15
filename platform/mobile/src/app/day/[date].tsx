import { monthLabel } from '@robes/core/calendar';
import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { DayView } from '@/features/plan/DayView';

// Every day opens this one screen (legacy ff87e89); back returns to wherever she came from.
export default function DayRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '');
  return (
    <StackScreen title={valid ? monthLabel(date.slice(0, 7)) : undefined}>
      {valid ? <DayView date={date} /> : null}
    </StackScreen>
  );
}
