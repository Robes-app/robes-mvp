import '../global.css';
import {
  Cormorant_300Light,
  Cormorant_300Light_Italic,
  Cormorant_400Regular,
  Cormorant_400Regular_Italic,
} from '@expo-google-fonts/cormorant';
import { Inter_300Light, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { ApiClientProvider } from '@robes/api-client/react';
import { ToastProvider } from '@robes/ui-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Uniwind } from 'uniwind';
import { api } from '@/lib/api';

// Light only, as beta: a dark-mode phone still sees cream (dark waits for a setting). Expo Go
// may ignore app.json's userInterfaceStyle, so the theme is pinned here too. Twin of web layout.tsx.
Uniwind.setTheme('light');

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    Cormorant_300Light,
    Cormorant_300Light_Italic,
    Cormorant_400Regular,
    Cormorant_400Regular_Italic,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
  });
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  );
  // A font that fails to load must not brick the app: hold the frame only while the load is
  // genuinely in flight, then render on the system face rather than a blank screen for good.
  if (!loaded && !fontError) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={api}>
        <View className="flex-1 bg-bg">
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="create" options={{ presentation: 'modal' }} />
              {/* The Add pieces sheet pulls up from the bottom edge with its grab bar. */}
              <Stack.Screen
                name="wardrobe/add"
                options={{
                  presentation: 'formSheet',
                  // The sheet draws its own handle above its title row (redline 02).
                  sheetGrabberVisible: false,
                  sheetAllowedDetents: [0.72, 1],
                  sheetCornerRadius: 22,
                }}
              />
            </Stack>
          </ToastProvider>
        </View>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
