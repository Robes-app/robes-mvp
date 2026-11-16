import { BottomSheet, Group, Host, RNHostView } from '@expo/ui/swift-ui';
import {
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import { type GlassAction, Sheet, SheetHead, useColor } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// It opens at two thirds of the screen, so a whole row of the grid shows under the header, tabs,
// search and chips (at half only a sliver did; Annie, 16 Nov).
const OPEN_AT = { fraction: 0.66 };

// iOS's own sheet with two heights (audit, native polish: the system grabber and detents). It opens
// at two thirds of the screen, pulls up to full and down to close, under iOS's own drag indicator, its
// spring and its dimming. The content is ours: the one sheet header (× · the title · `done` as a
// word, SheetHead), the body, and a `footer` held above the home indicator. Long lists start here
// (the LookPicker and the PiecePicker, Annie, 16 Nov); the other sheets keep the shared `Sheet`.
// Off iOS it is that `Sheet`. The web's drawers have no heights to pull between: their twins
// (look-picker.tsx, piece-picker.tsx) are unchanged.
export function DetentSheet({
  open,
  onClose,
  onClosed,
  title,
  done = null,
  footer,
  children,
  testID,
}: {
  open: boolean;
  onClose: () => void;
  // Once the sheet has fully gone (iOS presents nothing over a sheet still leaving).
  onClosed?: () => void;
  title: string;
  done?: GlassAction | null;
  footer?: ReactNode;
  children: ReactNode;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  // The sheet itself is the page's cream, so iOS's own white never shows under the hosted view
  // (it stopped short at the bottom edge on the simulator, 16 Nov).
  const bg = useColor('bg');
  if (Platform.OS !== 'ios') {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        {...(onClosed ? { onClosed } : {})}
        title={title}
        done={done}
        className="h-[92%]"
        {...(testID ? { testID } : {})}
      >
        <View className="flex-1">{children}</View>
        {footer ? <View className="pt-3">{footer}</View> : null}
      </Sheet>
    );
  }
  return (
    <Host style={{ position: 'absolute', width: 0, height: 0 }}>
      <BottomSheet
        isPresented={open}
        onIsPresentedChange={(presented) => {
          if (!presented) onClose();
        }}
        {...(onClosed ? { onDismiss: onClosed } : {})}
      >
        <Group
          modifiers={[
            presentationDetents([OPEN_AT, 'large']),
            presentationDragIndicator('visible'),
            presentationBackground(bg),
          ]}
        >
          <RNHostView>
            {/* The sheet is a window of its own, but React still sees it inside whatever opened
                it: a picker opened from a page's ScrollView (the draft, Edit look) read its grid's
                list as nested in that scroll and warned (simulator, 16 Nov). Nothing here scrolls
                with the page, so the sheet starts outside any. */}
            <ScrollView.Context.Provider value={null}>
              <View className="flex-1 bg-bg px-5 pt-5" testID={testID}>
                <SheetHead title={title} {...(done ? { action: done } : {})} onClose={onClose} />
                <View className="mt-3 flex-1">{children}</View>
                {footer ? (
                  <View className="pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
                    {footer}
                  </View>
                ) : null}
              </View>
            </ScrollView.Context.Provider>
          </RNHostView>
        </Group>
      </BottomSheet>
    </Host>
  );
}
