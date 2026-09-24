import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { LookDetail } from '@/features/looks/LookDetail';

export default function LookRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <StackScreen>
      <LookDetail id={id} />
    </StackScreen>
  );
}
