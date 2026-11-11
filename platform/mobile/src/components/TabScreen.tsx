import { useApi } from '@robes/api-client/react';
import { shell, ui } from '@robes/copy';
import {
  Avatar,
  FINE_EDGE,
  Heading,
  MIN_TOUCH,
  useReducedMotion,
  Wordmark,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';
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

// The greeting holds this long before it gives way to ROBES (Front Door canvas 1a: the greeting
// fades out over 0.45s, the mark in over 0.6s from 0.55s after).
const GREETING_HOLD_MS = 2400;
// Once per launch: coming back to Home finds ROBES standing.
let greeted = false;

// Home's mark (Front Door canvas 1a, Annie 9 Nov): "Good morning, Annie." centred in the bar on
// arrival, then ROBES centred in its place. Until today's greeting is known the bar's centre stays
// empty, so ROBES never blinks to the greeting. The web twin is HomeMark in
// app/src/components/shell/app-shell.tsx.
function HomeMark({ greeting }: { greeting: string | null }) {
  const reduced = useReducedMotion();
  const first = useRef(!greeted).current;
  const words = useRef(new Animated.Value(1)).current;
  const mark = useRef(new Animated.Value(first ? 0 : 1)).current;
  const showing = first && greeting !== null;
  useEffect(() => {
    if (!showing) return;
    greeted = true;
    const ms = (n: number) => (reduced ? 0 : n);
    const run = Animated.parallel([
      Animated.timing(words, {
        toValue: 0,
        delay: GREETING_HOLD_MS,
        duration: ms(450),
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(mark, {
        toValue: 1,
        delay: GREETING_HOLD_MS + ms(550),
        duration: ms(600),
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    run.start();
    return () => run.stop();
  }, [showing, reduced, words, mark]);
  if (first && greeting === null) return null;
  const layer = 'absolute inset-y-0 right-[66px] left-[66px] items-center justify-center';
  return (
    <View
      pointerEvents="none"
      className="absolute inset-0"
      accessible
      accessibilityRole="header"
      accessibilityLabel={greeting ?? ui.wordmark}
      testID="home-mark"
    >
      {showing ? (
        <Animated.View className={layer} style={{ opacity: words }}>
          <Heading size="md" numberOfLines={1} testID="home-greeting">
            {greeting}
          </Heading>
        </Animated.View>
      ) : null}
      <Animated.View className={layer} style={{ opacity: mark }}>
        <Wordmark />
      </Animated.View>
    </View>
  );
}

// Every tab root wears Felix's TopNav (D6, 2026-11-06; it replaces the iOS navigation redline's
// bar): 64pt tall, 24 in at each side, a 0.5pt hairline beneath it always; the bell (while
// anything waits) and the avatar disc on the right, 6 apart, each keeping a 44pt hit area. Home
// passes its `greeting` and the bar carries HomeMark centred; every other tab a serif `title`
// centred (PRD rev 3 §2.2: "Lookbook", "Your wardrobe"). A tab's switcher (Saved | Suggested,
// Pieces | Wishlist, List | Month) goes in `toolbar`, pinned under the bar. The web twin is the
// header in app/src/components/shell/app-shell.tsx.
export function TabScreen({
  title,
  greeting,
  toolbar,
  children,
}: {
  title?: string;
  // Home only: today's greeting, or null while it loads.
  greeting?: string | null;
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
          {title ? (
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              <Heading size="md" numberOfLines={1} testID="tab-title">
                {title}
              </Heading>
            </View>
          ) : greeting !== undefined ? (
            <HomeMark greeting={greeting} />
          ) : (
            <Wordmark accessibilityLabel={ui.wordmark} />
          )}
          <View className="ml-auto flex-row items-center gap-1.5">
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
