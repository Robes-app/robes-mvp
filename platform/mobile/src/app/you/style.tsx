import { twin } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { StyleDna } from '@/features/you/StyleDna';

export default function StyleDnaScreen() {
  return (
    <StackScreen settings title={twin.dnaPage.title}>
      <StyleDna />
    </StackScreen>
  );
}
