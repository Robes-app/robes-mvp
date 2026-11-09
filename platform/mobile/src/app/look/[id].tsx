import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { LookScreen } from '@/features/looks/LookScreen';

export default function LookRoute() {
  const { id, schedule, images } = useLocalSearchParams<{
    id: string;
    schedule?: string;
    images?: string;
  }>();
  return (
    <StackScreen>
      <LookScreen id={id} schedule={schedule === '1'} addPhoto={images === 'add'} />
    </StackScreen>
  );
}
