import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { DailyJobView } from '@/features/today/DailyLookView';

export default function DailyJobRoute() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  return (
    <StackScreen>
      <DailyJobView jobId={jobId} />
    </StackScreen>
  );
}
