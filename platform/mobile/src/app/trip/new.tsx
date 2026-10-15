import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { TripStart } from '@/features/trips/TripStart';
import { FeatureGate } from '@/lib/features';

// `brief`: her words from the home box, when they read as a trip.
export default function NewTripRoute() {
  const { brief } = useLocalSearchParams<{ brief?: string }>();
  return (
    <FeatureGate flag="trips">
      <StackScreen>
        <TripStart initialOccasions={typeof brief === 'string' ? brief.slice(0, 300) : ''} />
      </StackScreen>
    </FeatureGate>
  );
}
