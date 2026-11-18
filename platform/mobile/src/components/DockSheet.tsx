import { BottomSheet, Group, Host, RNHostView } from '@expo/ui/swift-ui';
import {
  ignoreSafeArea,
  type PresentationDetent,
  presentationBackground,
  presentationBackgroundInteraction,
  presentationCornerRadius,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import { useColor, useToastLift } from '@robes/ui-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The docked prompt's bar and thread as iOS's own sheet (docked prompt PRD phase 3, N1–N3), on
// iOS only. Three heights: the bar, fitted to what it holds, with the look live and scrolling
// behind it; the thread at half the screen over the dimmed look; full for a long thread. Swiping
// the bar down puts it away to the sparkle, which stays drawn on the look. iOS presents nothing
// over a sheet still on screen, so the screen closes it (`open` false) before it presents anything
// of its own, and waits for `onUp(false)`.

export type DockDetent = 'bar' | 'thread' | 'full';

const THREAD: PresentationDetent = { fraction: 0.5 };
const RADIUS = 22;
// Room for the system grabber above the bar's content.
const GRABBER = 18;
// Toasts stand this far clear of the bar.
const TOAST_GAP = 8;

function same(a: PresentationDetent, b: PresentationDetent): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  if ('height' in a && 'height' in b) return Math.abs(a.height - b.height) < 1;
  if ('fraction' in a && 'fraction' in b) return Math.abs(a.fraction - b.fraction) < 0.01;
  return false;
}

export function DockSheet({
  open,
  detent,
  onDetent,
  onDismiss,
  onUp,
  bar,
  thread,
  barOnly = false,
  testID,
}: {
  open: boolean;
  detent: DockDetent;
  // The sheet was dragged to another height.
  onDetent: (detent: DockDetent) => void;
  // She swiped it away: the dock is the sparkle again. Not called when the screen closes it.
  onDismiss: () => void;
  // The sheet is on screen (true), or has fully gone (false).
  onUp?: (up: boolean) => void;
  // What the bar shows, measured to size its height.
  bar: ReactNode;
  // What the thread shows (its title, the turns, the field).
  thread: ReactNode;
  // Nothing to open into yet (no conversation): the bar is the only height.
  barOnly?: boolean;
  testID?: string;
}) {
  const fill = useColor('surface-raised');
  // The bar's height follows its content (Robes' line, the answer rows, the field).
  const [barHeight, setBarHeight] = useState(160);
  // iOS keeps the home indicator's inset under a height-sized sheet's content, so the bar stood
  // on 34pt of empty sheet (Annie, 18 Nov): at the bar the content runs into that inset and the
  // height leaves it out.
  const { bottom } = useSafeAreaInsets();
  const BAR: PresentationDetent = { height: Math.max(barHeight - bottom, 80) };
  const toDetent = (d: DockDetent): PresentationDetent =>
    d === 'bar' ? BAR : d === 'thread' ? THREAD : 'large';
  const fromDetent = (d: PresentationDetent): DockDetent =>
    same(d, BAR) ? 'bar' : same(d, THREAD) ? 'thread' : 'full';
  // Toasts are drawn under the sheet: at the bar they stand above it (the thread dims the look,
  // and says what it needs itself).
  useToastLift(open && detent === 'bar' ? barHeight + TOAST_GAP : 0);
  // Whether the screen still means it open, so a close it asked for is not taken for her swipe.
  const meant = useRef(open);
  meant.current = open;
  const up = useRef(onUp);
  up.current = onUp;
  useEffect(() => {
    if (open) up.current?.(true);
  }, [open]);
  return (
    <Host style={{ position: 'absolute', width: 0, height: 0 }}>
      <BottomSheet
        isPresented={open}
        onIsPresentedChange={(presented) => {
          if (!presented && meant.current) onDismiss();
        }}
        onDismiss={() => up.current?.(false)}
      >
        <Group
          modifiers={[
            presentationDetents(barOnly ? [BAR] : [BAR, THREAD, 'large'], {
              selection: toDetent(detent),
              onSelectionChange: (d) => onDetent(fromDetent(d)),
            }),
            // The look stays live under the bar: it scrolls, and its tabs and Edit work (N2).
            presentationBackgroundInteraction({ type: 'enabledUpThrough', detent: BAR }),
            presentationCornerRadius(RADIUS),
            presentationBackground(fill),
            presentationDragIndicator('visible'),
            ...(detent === 'bar'
              ? [ignoreSafeArea({ regions: 'container', edges: 'bottom' })]
              : []),
          ]}
        >
          <RNHostView>
            <ScrollView.Context.Provider value={null}>
              <View className="flex-1 bg-surface-raised" testID={testID}>
                {detent === 'bar' ? (
                  // Laid out at its own height, not the sheet's, so the measure can grow the sheet
                  // (measured inside the sheet it shrank to fit nothing: spike, 18 Nov).
                  <View
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: GRABBER }}
                    onLayout={(e) => {
                      const h = Math.ceil(e.nativeEvent.layout.height);
                      if (h > 0 && Math.abs(h - barHeight) > 1) setBarHeight(h);
                    }}
                  >
                    {bar}
                  </View>
                ) : (
                  <View className="flex-1" style={{ paddingTop: GRABBER }}>
                    {thread}
                  </View>
                )}
              </View>
            </ScrollView.Context.Provider>
          </RNHostView>
        </Group>
      </BottomSheet>
    </Host>
  );
}
