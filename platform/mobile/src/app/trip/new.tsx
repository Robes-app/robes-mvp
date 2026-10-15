import { StackScreen } from '@/components/StackScreen';
import { TripStart } from '@/features/trips/TripStart';
import { FeatureGate } from '@/lib/features';

export default function NewTripRoute() {
  return (
    <FeatureGate flag="trips">
      <StackScreen>
        <TripStart />
      </StackScreen>
    </FeatureGate>
  );
}
