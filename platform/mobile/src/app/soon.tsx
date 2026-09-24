import { shell } from '@robes/copy';
import { EmptyState } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { StackScreen } from '@/components/StackScreen';

export default function Soon() {
  const router = useRouter();
  return (
    <StackScreen>
      <View className="flex-1 justify-center">
        <EmptyState
          title={shell.soon.title}
          body={shell.soon.body}
          action={{ label: shell.soon.back, onPress: () => router.replace('/') }}
        />
      </View>
    </StackScreen>
  );
}
