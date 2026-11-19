import { twin } from '@robes/copy';
import { STYLE_DNA_SECTIONS, type StyleDnaSection } from '@robes/core/home';
import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { StyleDna } from '@/features/you/StyleDna';

const isSection = (v: unknown): v is StyleDnaSection =>
  (STYLE_DNA_SECTIONS as readonly unknown[]).includes(v);

export default function StyleDnaScreen() {
  const { open } = useLocalSearchParams<{ open?: string }>();
  return (
    <StackScreen settings title={twin.dnaPage.title}>
      <StyleDna open={isSection(open) ? open : null} />
    </StackScreen>
  );
}
