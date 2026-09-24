import '../global.css';
import { Cormorant_300Light, Cormorant_400Regular } from '@expo-google-fonts/cormorant';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { ToastProvider } from '@robes/ui-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function RootLayout() {
  const [loaded] = useFonts({
    Cormorant_300Light,
    Cormorant_400Regular,
    Inter_400Regular,
    Inter_500Medium,
  });
  if (!loaded) return null;
  return (
    <View className="flex-1 bg-bg">
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ToastProvider>
    </View>
  );
}
