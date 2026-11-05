import { ui } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { Heading, IconButton, MIN_TOUCH, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Pushed screens and modals (a piece, a look, a day): a back (or close) chevron and a small
// centred title — the tab bar is gone here, so the title says where she is.
export function StackScreen({
  title,
  children,
  close = false,
  home = false,
  settings = false,
  bare = false,
}: {
  title?: string;
  children: ReactNode;
  close?: boolean;
  // You's screens carry Settings' header: the title in the serif at 22 (web SettingsHeader).
  settings?: boolean;
  // Back always lands home (a screen reached from onboarding has nothing worth going back to).
  home?: boolean;
  // No header row (redlines R1/R2): the screen's picture starts under the status bar and the
  // back control floats over it — a 44pt glass disc 14pt from the top-left of the safe area.
  bare?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ink = useColor('ink');
  const back = () => (!home && router.canGoBack() ? router.back() : router.replace('/'));
  if (bare) {
    return (
      <View className="flex-1 bg-bg" style={{ paddingBottom: insets.bottom }}>
        <View className="flex-1">{children}</View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ui.back}
          onPress={back}
          className="absolute items-center justify-center rounded-pill bg-glass"
          style={{ top: insets.top + 14, left: 14, width: MIN_TOUCH, height: MIN_TOUCH }}
          testID="stack-back"
        >
          <Icon name="back" size={18} color={ink} />
        </Pressable>
      </View>
    );
  }
  return (
    // Uniwind doesn't style third-party views, so insets go on a plain View.
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Settings' header sits on the cream with a hairline under it, so rows never run under the
          title (web SettingsHeader). */}
      <View
        className={`h-11 flex-row items-center px-2 ${settings ? 'border-b border-hairline bg-bg' : ''}`}
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
          onPress={back}
        />
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
}
