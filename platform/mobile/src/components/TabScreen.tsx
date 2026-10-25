import { useApi } from '@robes/api-client/react';
import { shell } from '@robes/copy';
import { Avatar, fonts, MIN_TOUCH, Wordmark } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Every tab root wears beta's header: ROBES left, the avatar that opens You right, 44pt tall.
// The tab bar says where she is, so the tab's name is read to assistive tech only. A tab's
// switcher (Saved | Suggested, Pieces | Wishlist, List | Month) goes in `toolbar`, which stays
// pinned under the header while the content beneath it scrolls.
export function TabScreen({
  title,
  toolbar,
  children,
}: {
  title: string;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: me } = useApi('me.get');
  return (
    // Uniwind doesn't style third-party views, so insets go on a plain View.
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="h-11 flex-row items-center justify-between px-5">
        <View accessible accessibilityRole="header" accessibilityLabel={title}>
          <Wordmark
            accessibilityRole="none"
            importantForAccessibility="no"
            accessibilityElementsHidden
            style={{ fontFamily: fonts.displayRegular, fontSize: 18, letterSpacing: 6 }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shell.openYou}
          onPress={() => router.push('/you')}
          style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH }}
          className="items-center justify-center"
          testID="open-you"
        >
          <Avatar name={me?.firstName ?? me?.email ?? null} size="sm" label="" />
        </Pressable>
      </View>
      {toolbar ? <View className="px-5 pt-[14px]">{toolbar}</View> : null}
      <View className="flex-1">{children}</View>
    </View>
  );
}
