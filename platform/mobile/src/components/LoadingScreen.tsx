import { useColor } from '@robes/ui-native';
import { ActivityIndicator, View } from 'react-native';

export function LoadingScreen() {
  const ink = useColor('ink-muted');
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator color={ink} />
    </View>
  );
}
