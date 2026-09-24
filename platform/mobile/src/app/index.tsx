import { Text, View } from 'react-native';

export default function Home() {
  return (
    <View className="flex-1 justify-center gap-4 bg-bg px-6">
      <Text className="text-xs uppercase tracking-widest text-ink-muted">Robes</Text>
      <Text className="text-5xl text-ink" style={{ fontFamily: 'Cormorant_300Light' }}>
        Your wardrobe, styled.
      </Text>
      <Text className="text-ink-muted" style={{ fontFamily: 'Inter_400Regular' }}>
        Platform foundations are running.
      </Text>
    </View>
  );
}
