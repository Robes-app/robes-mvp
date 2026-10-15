import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { TripView } from '@/features/trips/TripView';
import { FeatureGate } from '@/lib/features';

export default function TripRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <FeatureGate flag="trips">
      <StackScreen>
        <TripView id={id} />
      </StackScreen>
    </FeatureGate>
  );
}
