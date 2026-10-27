import { ui } from '@robes/copy';
import { Heading, IconButton } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Pushed screens and modals (a piece, a look, a day): a back (or close) chevron and a small
// centred title — the tab bar is gone here, so the title says where she is.
export function StackScreen({
  title,
  children,
  close = false,
  home = false,
  settings = false,
}: {
  title?: string;
  children: ReactNode;
  close?: boolean;
  // You's screens carry Settings' header: the title in the serif at 22 (web SettingsHeader).
  settings?: boolean;
  // Back always lands home (a screen reached from onboarding has nothing worth going back to).
  home?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    // Uniwind doesn't style third-party views, so insets go on a plain View.
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Settings' header sits on the cream with a hairline under it, so rows never run under the
          title (web SettingsHeader). */}
      <View
        className={`h-11 flex-row items-center px-2 ${settings ? 'border-b border-rule-mid bg-bg' : ''}`}
      >
        {title ? (
          <View pointerEvents="none" className="absolute inset-x-14 items-center">
            <Heading
              size="sm"
              weight="regular"
              numberOfLines={1}
              style={settings ? { fontSize: 22 } : undefined}
            >
              {title}
            </Heading>
          </View>
        ) : null}
        <IconButton
          icon={close ? 'close' : 'back'}
          label={close ? ui.close : ui.back}
          onPress={() => (!home && router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
}
