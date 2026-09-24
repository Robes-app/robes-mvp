import '../global.css';
import { Cormorant_300Light } from '@expo-google-fonts/cormorant';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';

export default function RootLayout() {
  const [loaded] = useFonts({ Cormorant_300Light, Inter_400Regular, Inter_500Medium });
  if (!loaded) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
