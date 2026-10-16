import { ui } from '@robes/copy';
import { Heading, IconButton } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Pushed screens and modals: a back (or close) control and a title.
export function StackScreen({
  title,
  children,
  close = false,
  home = false,
}: {
  title?: string;
  children: ReactNode;
  close?: boolean;
  // Back always lands home (a screen reached from onboarding has nothing worth going back to).
  home?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    // Uniwind doesn't style third-party views, so insets go on a plain View.
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="flex-row items-center gap-2 px-4 pt-2">
        <IconButton
          icon={close ? 'close' : 'back'}
          label={close ? ui.close : ui.back}
          onPress={() => (!home && router.canGoBack() ? router.back() : router.replace('/'))}
        />
        {title ? <Heading size="sm">{title}</Heading> : null}
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
}
