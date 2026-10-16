import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { IdeaScreen } from '@/features/looks/IdeaScreens';

export default function IdeaRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <StackScreen>
      <IdeaScreen id={id} />
    </StackScreen>
  );
}
