import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { LookScreen } from '@/features/looks/LookScreen';

export default function LookRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <StackScreen>
      <LookScreen id={id} />
    </StackScreen>
  );
}
