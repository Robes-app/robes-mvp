import '@/lib/crypto-polyfill';
import '../global.css';
import {
  Cormorant_300Light,
  Cormorant_300Light_Italic,
  Cormorant_400Regular,
  Cormorant_400Regular_Italic,
} from '@expo-google-fonts/cormorant';
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { ApiClientProvider } from '@robes/api-client/react';
import { ToastProvider } from '@robes/ui-native';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Uniwind } from 'uniwind';
import { DRAFT_SHEET } from '@/components/FormSheetScreen';
import { api } from '@/lib/api';
import { noteApiError } from '@/lib/session-events';
import { SessionGate } from '@/lib/session-gate';
import { TimeZoneSync } from '@/lib/timezone';

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
    Inter_600SemiBold,
  });
  // Every query's and mutation's error is heard once for what it says about the session (401,
  // 426): the SessionGate acts on it (audit F6).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000 } },
        queryCache: new QueryCache({ onError: noteApiError }),
        mutationCache: new MutationCache({ onError: noteApiError }),
      }),
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
              {/* The draft look rises over whatever started it (D14). */}
              <Stack.Screen name="looks/draft/[id]" options={DRAFT_SHEET} />
            </Stack>
            <SessionGate />
            <TimeZoneSync />
          </ToastProvider>
        </View>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
