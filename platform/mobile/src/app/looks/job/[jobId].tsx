import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { JobIdeaScreen } from '@/features/looks/IdeaScreens';

export default function JobResult() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  return (
    <StackScreen>
      <JobIdeaScreen jobId={jobId} />
    </StackScreen>
  );
}
