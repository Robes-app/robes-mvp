import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { TripJobView } from '@/features/trips/TripView';

export default function TripJobRoute() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  return (
    <StackScreen>
      <TripJobView jobId={jobId} />
    </StackScreen>
  );
}
