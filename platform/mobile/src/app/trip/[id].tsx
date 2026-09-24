import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { TripView } from '@/features/trips/TripView';

export default function TripRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <StackScreen>
      <TripView id={id} />
    </StackScreen>
  );
}
