import { useApi } from '@robes/api-client/react';
import { shell, ui } from '@robes/copy';
import { Avatar, MIN_TOUCH, Wordmark } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell } from './Bell';

export interface TabScrollProps {
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
  contentInset: { bottom: number };
  scrollIndicatorInsets: { bottom: number };
}

const TabScrollContext = createContext<TabScrollProps | null>(null);

// Spread on a tab root's main list: it scrolls beneath the system tab bar and ends clear of it,
// and it tells the top bar when to draw its hairline.
export function useTabScroll(): Partial<TabScrollProps> {
  return useContext(TabScrollContext) ?? {};
}

// Every tab root wears the same top bar (iOS navigation redline, 2026-11-04): ROBES 16 in on the
// left; the bell and the avatar on the right, 44 hit areas that abut, the avatar 16 from the edge.
// At the scroll edge the bar has no hairline; once she scrolls, a hairline sits beneath it. A
// tab's switcher (Saved | Suggested, Pieces | Wishlist, List | Month) goes in `toolbar`, pinned
// under the bar. The web twin is the header in app/src/components/shell/app-shell.tsx.
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
  const [scrolled, setScrolled] = useState(false);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > 0;
    setScrolled((was) => (was === next ? was : next));
  }, []);
  // On iOS each tab screen's safe area includes the tab bar it scrolls beneath; on Android the
  // tab bar sits below the screen and the navigator pads for it.
  const bottom = Platform.OS === 'ios' ? insets.bottom : 0;
  const scroll = useMemo<TabScrollProps>(
    () => ({
      onScroll,
      scrollEventThrottle: 16,
      contentInset: { bottom },
      scrollIndicatorInsets: { bottom },
    }),
    [onScroll, bottom],
  );
  return (
    // Uniwind doesn't style third-party views, so insets go on a plain View.
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View
        testID="tab-chrome"
        className={`border-b bg-bg ${scrolled ? 'border-hairline' : 'border-transparent'}`}
      >
        <View className="h-11 flex-row items-center justify-between px-4">
          <Wordmark accessibilityLabel={ui.wordmark} />
          {/* The avatar's hit area runs 6 past its ring, so the ring stands 16 from the edge. */}
          <View className="-mr-1.5 flex-row items-center">
            <Bell />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={shell.openYou}
              onPress={() => router.push('/you')}
              style={({ pressed }) => ({
                width: MIN_TOUCH,
                height: MIN_TOUCH,
                opacity: pressed ? 0.6 : 1,
              })}
              className="items-center justify-center"
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
