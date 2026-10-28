import { ui } from '@robes/copy';
import { Heading, IconButton } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The one presentation for a route that pulls up from the bottom edge (app/_layout.tsx: Create,
// Add pieces): bottom sheets over modals, the same detents, no system grabber (the head draws it).
export const FORM_SHEET: {
  presentation: 'formSheet';
  sheetGrabberVisible: boolean;
  sheetAllowedDetents: number[];
  sheetCornerRadius: number;
} = {
  presentation: 'formSheet',
  sheetGrabberVisible: false,
  sheetAllowedDetents: [0.72, 1],
  sheetCornerRadius: 22,
};

// The head of a FORM_SHEET route, one for both (Add Piece handoff redline 02): its own grab handle
// (36×4, 8pt from the top), then a 44pt row with × left and the serif title centred. The sheet
// runs to the screen's bottom edge, so the body stops above the home indicator.
export function FormSheetScreen({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-bg" style={{ paddingBottom: insets.bottom }}>
      <View aria-hidden className="mt-2 h-1 w-9 self-center rounded-pill bg-rule-mid" />
      <View className="h-11 flex-row items-center px-3">
        <IconButton icon="close" label={ui.close} onPress={() => router.back()} />
        <Heading size="sm" className="flex-1 text-center" style={{ fontSize: 19 }}>
          {title}
        </Heading>
        <View className="w-11" />
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
}
