import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { Deck } from '@/features/looks/Deck';

export default function DeckRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <StackScreen>
      <Deck setId={id} />
    </StackScreen>
  );
}
