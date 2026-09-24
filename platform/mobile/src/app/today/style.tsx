import { StackScreen } from '@/components/StackScreen';
import { DailyStart } from '@/features/today/DailyStart';

export default function StyleTodayRoute() {
  return (
    <StackScreen>
      <DailyStart />
    </StackScreen>
  );
}
