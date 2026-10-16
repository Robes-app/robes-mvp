import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { JobDeck } from '@/features/looks/Deck';

// A styling job lands on the keep-or-pass deck (legacy 2026-10-07/09); `from=home` (home's box,
// onboarding) sends every way back home.
export default function JobResult() {
  const { jobId, from } = useLocalSearchParams<{ jobId: string; from?: string }>();
  const home = from === 'home';
  return (
    <StackScreen home={home}>
      <JobDeck jobId={jobId} home={home} />
    </StackScreen>
  );
}
