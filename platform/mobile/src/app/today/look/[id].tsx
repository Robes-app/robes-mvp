import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { DailyLookView } from '@/features/today/DailyLookView';

export default function DailyLookRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <StackScreen>
      <DailyLookView id={id} />
    </StackScreen>
  );
}
