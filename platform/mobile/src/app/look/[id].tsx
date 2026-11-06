import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { LookScreen } from '@/features/looks/LookScreen';

export default function LookRoute() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  return (
    <StackScreen>
      <LookScreen id={id} edit={edit === '1'} />
    </StackScreen>
  );
}
