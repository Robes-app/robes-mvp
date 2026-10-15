import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { JobDeck } from '@/features/looks/Deck';

// A styling job lands on the keep-or-pass deck (legacy 2026-10-07/09).
export default function JobResult() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  return (
    <StackScreen>
      <JobDeck jobId={jobId} />
    </StackScreen>
  );
}
