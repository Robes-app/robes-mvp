import { twin } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { Observations } from '@/features/you/Observations';

export default function ObservationsScreen() {
  return (
    <StackScreen settings title={twin.observations.title}>
      <Observations />
    </StackScreen>
  );
}
