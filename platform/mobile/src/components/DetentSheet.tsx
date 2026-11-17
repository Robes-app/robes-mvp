import { BottomSheet, Group, Host, RNHostView } from '@expo/ui/swift-ui';
import {
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import {
  fonts,
  type GlassAction,
  maxFontSizeMultiplier,
  Sheet,
  SheetHead,
  useColor,
} from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Platform, Text as RNText, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// It opens at two thirds of the screen, so a whole row of the grid shows under the header, tabs,
// search and chips (at half only a sliver did; Annie, 16 Nov).
const OPEN_AT = { fraction: 0.66 };

// iOS's own sheet with two heights (audit, native polish: the system grabber and detents). It
// opens at two thirds of the screen, pulls up to full and down to close, under iOS's own drag
// indicator, its spring and its dimming. The content is ours: the one sheet header (× or a drill's
// back · the title · `done` as a word, SheetHead), an `eyebrow` and `media` under it where the
// sheet is about something, the body (`scroll` for one that does not scroll itself), and a
// `footer` held above the home indicator. The long sheets stand on it: the LookPicker, the
// PiecePicker, the WardrobePicker, a piece's fields, Worn and In looks, and the DiarySheet (Annie,
// 16 Nov); then Seasons, the Bell, the Place sheet and an Idea's way (17 Nov). Short asks (a
// confirm, the photo choice) and the floating prompt dock keep the shared `Sheet`. Off iOS it is that `Sheet`. The web's drawers
// have no heights to pull between: their twins are unchanged.
export function DetentSheet({
  open,
  onClose,
  onClosed,
  title,
  done = null,
  leading,
  eyebrow,
  media,
  scroll = false,
  footer,
  children,
  testID,
}: {
  open: boolean;
  onClose: () => void;
  // Once the sheet has fully gone (iOS presents nothing over a sheet still leaving).
  onClosed?: () => void;
  // Left out for a sheet whose body is its own head (the Place sheet's search, with its ×).
  title?: string;
  done?: GlassAction | null;
  // In the ×'s place: a drill's back chevron.
  leading?: ReactNode;
  // A small-caps line under the header (the DiarySheet's "Add to your diary", a category's path).
  eyebrow?: string;
  // A picture of what the sheet is about, beside the eyebrow (the look being filed).
  media?: ReactNode;
  // The body scrolls inside the sheet; off for a body that scrolls itself (a grid's list).
  scroll?: boolean;
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
        {...(title !== undefined ? { title } : {})}
        done={done}
        {...(eyebrow ? { eyebrow } : {})}
        {...(media ? { media } : {})}
        {...(leading ? { leading } : {})}
        className="h-[92%]"
        {...(testID ? { testID } : {})}
      >
        {scroll ? (
          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View className="flex-1">{children}</View>
        )}
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
                {title !== undefined ? (
                  <SheetHead
                    title={title}
                    {...(done ? { action: done } : {})}
                    {...(leading ? { leading } : {})}
                    onClose={onClose}
                  />
                ) : null}
                {eyebrow || media ? (
                  <View className="mt-3 flex-row items-center gap-3">
                    {media}
                    {eyebrow ? (
                      <RNText
                        maxFontSizeMultiplier={maxFontSizeMultiplier.label}
                        className="min-w-0 flex-1 text-accent-warm text-xs uppercase"
                        style={{ fontFamily: fonts.sansRegular, letterSpacing: 2.64 }}
                      >
                        {eyebrow}
                      </RNText>
                    ) : null}
                  </View>
                ) : null}
                {scroll ? (
                  <ScrollView
                    className={title !== undefined ? 'mt-3 flex-1' : 'flex-1'}
                    automaticallyAdjustKeyboardInsets
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: footer ? 8 : insets.bottom + 16 }}
                  >
                    {children}
                  </ScrollView>
                ) : (
                  <View className={title !== undefined ? 'mt-3 flex-1' : 'flex-1'}>{children}</View>
                )}
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
