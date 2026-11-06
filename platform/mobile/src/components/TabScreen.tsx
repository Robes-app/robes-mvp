import { useApi } from '@robes/api-client/react';
import { shell, ui } from '@robes/copy';
import { Avatar, FINE_EDGE, MIN_TOUCH, Wordmark } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell } from './Bell';

export interface TabScrollProps {
  contentInset: { bottom: number };
  scrollIndicatorInsets: { bottom: number };
}

const TabScrollContext = createContext<TabScrollProps | null>(null);
const AVATAR = 30;

// Spread on a tab root's main list: it scrolls beneath the system tab bar and ends clear of it.
export function useTabScroll(): Partial<TabScrollProps> {
  return useContext(TabScrollContext) ?? {};
}

// Every tab root wears Felix's TopNav (D6, 2026-11-06; it replaces the iOS navigation redline's
// bar): 64pt tall, 24 in at each side, a 0.5pt hairline beneath it always; ROBES on the left, the
// bell and the avatar disc on the right, 6 apart, each keeping a 44pt hit area. A tab's switcher
// (Saved | Suggested, Pieces | Wishlist, List | Month) goes in `toolbar`, pinned under the bar.
// The web twin is the header in app/src/components/shell/app-shell.tsx.
export function TabScreen({
  toolbar,
  children,
}: {
  toolbar?: ReactNode;
  // A function child gets the scroll props directly, for a screen that draws its own TabScreen.
  children: ReactNode | ((scroll: TabScrollProps) => ReactNode);
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: me } = useApi('me.get');
  // On iOS each tab screen's safe area includes the tab bar it scrolls beneath; on Android the
  // tab bar sits below the screen and the navigator pads for it.
  const bottom = Platform.OS === 'ios' ? insets.bottom : 0;
  const scroll = useMemo<TabScrollProps>(
    () => ({
      contentInset: { bottom },
      scrollIndicatorInsets: { bottom },
    }),
    [bottom],
  );
  return (
    // Uniwind doesn't style third-party views, so insets go on a plain View.
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View
        testID="tab-chrome"
        className="border-hairline bg-bg"
        style={{ borderBottomWidth: FINE_EDGE }}
      >
        {/* 64 with the hairline inside it, as Felix draws the bar. */}
        <View
          className="flex-row items-center justify-between px-6"
          style={{ height: 64 - FINE_EDGE }}
        >
          <Wordmark accessibilityLabel={ui.wordmark} />
          <View className="flex-row items-center gap-1.5">
            <Bell />
            {/* A 30pt disc; its hit area reaches 44. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={shell.openYou}
              onPress={() => router.push('/you')}
              hitSlop={(MIN_TOUCH - AVATAR) / 2}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              testID="open-you"
            >
              <Avatar name={me?.firstName ?? me?.email ?? null} tone="nav" label="" />
            </Pressable>
          </View>
        </View>
        {toolbar ? <View className="px-5 pt-[14px]">{toolbar}</View> : null}
      </View>
      <TabScrollContext value={scroll}>
        <View className="flex-1">
          {typeof children === 'function' ? children(scroll) : children}
        </View>
      </TabScrollContext>
    </View>
  );
}
