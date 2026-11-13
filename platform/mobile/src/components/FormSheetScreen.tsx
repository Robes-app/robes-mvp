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

// A form sheet's own frame must never be flattened away. react-native-screens looks for a ScrollView
// among the sheet's top views and, finding it third (after a head), stretches it over the whole
// sheet: over the head and under the foot, so the draft's prompt box sat under Style it and would
// not scroll (Annie, Felix, 12 Nov). Every view between the sheet and its ScrollView carries
// `collapsable={false}`, so the ScrollView keeps the frame our layout gives it.

// The draft look's sheet (Felix DraftLook, D14): the same bottom-edge presentation at full height,
// 24pt under the top edge, so it stands over whatever started it. Twin of the web Drawer.
export const DRAFT_SHEET: typeof FORM_SHEET = { ...FORM_SHEET, sheetAllowedDetents: [1] };

// The head of a FORM_SHEET route, one for both (Add Piece handoff redline 02): its own grab handle
// (36×4, 8pt from the top), then a 44pt row with × left and the serif title centred. The sheet
// runs to the screen's bottom edge, so the body stops above the home indicator.
export function FormSheetScreen({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View collapsable={false} className="flex-1 bg-bg" style={{ paddingBottom: insets.bottom }}>
      <View aria-hidden className="mt-2 h-1 w-9 self-center rounded-pill bg-rule-mid" />
      <View className="h-11 flex-row items-center px-3">
        <IconButton icon="close" label={ui.close} onPress={() => router.back()} />
        <Heading size="sm" className="flex-1 text-center" style={{ fontSize: 19 }}>
          {title}
        </Heading>
        <View className="w-11" />
      </View>
      <View collapsable={false} className="flex-1" testID="form-sheet-body">
        {children}
      </View>
    </View>
  );
}
