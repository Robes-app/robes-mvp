import { ui } from '@robes/copy';
import { Heading, IconButton } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Pushed screens and modals: a back (or close) control and a title.
export function StackScreen({
  title,
  children,
  close = false,
}: {
  title?: string;
  children: ReactNode;
  close?: boolean;
}) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <View className="flex-row items-center gap-2 px-4 pt-2">
        <IconButton
          icon={close ? 'close' : 'back'}
          label={close ? ui.close : ui.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        {title ? <Heading size="sm">{title}</Heading> : null}
      </View>
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
}
