import { StackScreen } from '@/components/StackScreen';
import { TripStart } from '@/features/trips/TripStart';

export default function NewTripRoute() {
  return (
    <StackScreen>
      <TripStart />
    </StackScreen>
  );
}
