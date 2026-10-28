import { shell } from '@robes/copy';
import { EmptyState } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { StackScreen } from '@/components/StackScreen';

// A link to a screen that isn't here (an old email, a mistyped deep link) lands on this, never
// Expo's dev screen. Twin of web app/src/app/not-found.tsx; chevron and button both go home.
export default function NotFound() {
  const router = useRouter();
  return (
    <StackScreen home>
      <View className="flex-1 justify-center px-6">
        <EmptyState
          title={shell.notFound.title}
          action={{ label: shell.notFound.back, onPress: () => router.replace('/') }}
        />
      </View>
    </StackScreen>
  );
}
