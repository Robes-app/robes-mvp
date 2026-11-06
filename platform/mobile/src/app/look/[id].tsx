import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { LookScreen } from '@/features/looks/LookScreen';

export default function LookRoute() {
  const { id, edit, schedule } = useLocalSearchParams<{
    id: string;
    edit?: string;
    schedule?: string;
  }>();
  return (
    <StackScreen>
      <LookScreen id={id} edit={edit === '1'} schedule={schedule === '1'} />
    </StackScreen>
  );
}
