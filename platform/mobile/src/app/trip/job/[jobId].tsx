import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { TripJobView } from '@/features/trips/TripView';
import { FeatureGate } from '@/lib/features';

export default function TripJobRoute() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  return (
    <FeatureGate flag="trips">
      <StackScreen>
        <TripJobView jobId={jobId} />
      </StackScreen>
    </FeatureGate>
  );
}
