import { useApi } from '@robes/api-client/react';
import { shell } from '@robes/copy';
import { Avatar, Heading, MIN_TOUCH } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Every tab root: its title and the avatar that opens You (IA §3.2).
export function TabScreen({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const { data: me } = useApi('me.get');
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-6 pb-2 pt-2">
        <Heading size="md">{title}</Heading>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shell.openYou}
          onPress={() => router.push('/you')}
          hitSlop={8}
          style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH }}
          className="items-center justify-center"
          testID="open-you"
        >
          <Avatar name={me?.firstName ?? me?.email ?? null} size="sm" />
        </Pressable>
      </View>
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
}
