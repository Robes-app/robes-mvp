import { SheetHead, useNativeGlass } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The one presentation for a route that pulls up from the bottom edge (app/_layout.tsx: Add
// pieces): bottom sheets over modals, the same detents. It moves between two heights, so it shows
// iOS's own grabber, the handle VoiceOver knows. Its ground is see-through so iOS 26 can lay its
// Liquid Glass under the content (FormSheetScreen paints the cream where there is no glass).
export const FORM_SHEET: {
  presentation: 'formSheet';
  sheetGrabberVisible: boolean;
  sheetAllowedDetents: number[];
  sheetCornerRadius: number;
  contentStyle: { backgroundColor: 'transparent' };
} = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.72, 1],
  sheetCornerRadius: 22,
  contentStyle: { backgroundColor: 'transparent' },
};

// A form sheet's own frame must never be flattened away. react-native-screens looks for a ScrollView
// among the sheet's top views and, finding it third (after a head), stretches it over the whole
// sheet: over the head and under the foot, so the draft's prompt box sat under Style it and would
// not scroll (Annie, Felix, 12 Nov). Every view between the sheet and its ScrollView carries
// `collapsable={false}`, so the ScrollView keeps the frame our layout gives it.

// The draft look's sheet (Felix DraftLook, D14): the same bottom-edge presentation at full height,
// 24pt under the top edge, so it stands over whatever started it. Twin of the web Drawer.
// One height only, so no grabber; the draft paints its own cream ground.
export const DRAFT_SHEET: typeof FORM_SHEET = {
  ...FORM_SHEET,
  sheetGrabberVisible: false,
  sheetAllowedDetents: [1],
};

// The head of a FORM_SHEET route: the same head as every glass sheet (SheetHead: the × disc left,
// the sans title centred), under iOS's grabber, so Add pieces looks the same from the + and from a
// link. Liquid Glass on iOS 26; the cream ground elsewhere or with Reduce Transparency. The sheet
// runs to the screen's bottom edge, so the body stops above the home indicator.
export function FormSheetScreen({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const glass = useNativeGlass();
  return (
    <View
      collapsable={false}
      className={glass ? 'flex-1' : 'flex-1 bg-bg'}
      style={{ paddingBottom: insets.bottom }}
    >
      <View className="px-5 pt-5 pb-1">
        <SheetHead title={title} onClose={() => router.back()} />
      </View>
      <View collapsable={false} className="flex-1" testID="form-sheet-body">
        {children}
      </View>
    </View>
  );
}
