import { ui } from '@robes/copy';
import { Heading, IconButton } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBareScreen } from '@/components/StackScreen';

// A piece's page bar (Front Door canvas 3b, PRD §7.3): ‹ at the left, the piece's name centred in
// the serif, and the page's one control at the right (the Hero Rack star on a piece she owns). It
// stands in for the stack's own header, under the status bar. Shared by the piece and the wish
// pages. Web twin: PieceHeader in app/src/components/wardrobe/piece-header.tsx.
export function PieceHeader({
  title,
  faint = false,
  trailing,
}: {
  title: string;
  // A name Robes hasn't read yet ("New piece"): a placeholder, not a fact.
  faint?: boolean;
  trailing?: ReactNode;
}) {
  useBareScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-bg" style={{ paddingTop: insets.top }} testID="piece-header">
      <View className="h-16 flex-row items-center px-2">
        <View pointerEvents="none" className="absolute inset-x-16 items-center">
          <Heading
            size="md"
            numberOfLines={1}
            tone={faint ? 'faint' : 'ink'}
            style={{ fontSize: 22 }}
          >
            {title}
          </Heading>
        </View>
        <IconButton
          icon="back"
          label={ui.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/wardrobe'))}
          testID="piece-back"
        />
        <View className="ml-auto pr-2">{trailing}</View>
      </View>
    </View>
  );
}
