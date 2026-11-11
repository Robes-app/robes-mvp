import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { LookScreen } from '@/features/looks/LookScreen';

export default function LookRoute() {
  const { id, schedule } = useLocalSearchParams<{ id: string; schedule?: string }>();
  return (
    <StackScreen>
      <LookScreen id={id} schedule={schedule === '1'} />
    </StackScreen>
  );
}
