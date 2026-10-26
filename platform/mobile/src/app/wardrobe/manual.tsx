import { wardrobe } from '@robes/copy';
import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { destinationOf } from '@/features/wardrobe/add/flow';
import { ManualAdd } from '@/features/wardrobe/add/ManualAdd';

export default function ManualAddRoute() {
  const { to } = useLocalSearchParams<{ to?: string }>();
  return (
    <StackScreen title={wardrobe.add.doors.manual}>
      <ManualAdd to={destinationOf(to)} />
    </StackScreen>
  );
}
