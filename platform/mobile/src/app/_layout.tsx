import '../global.css';
import {
  Cormorant_300Light,
  Cormorant_300Light_Italic,
  Cormorant_400Regular,
  Cormorant_400Regular_Italic,
} from '@expo-google-fonts/cormorant';
import { Inter_300Light, Inter_500Medium } from '@expo-google-fonts/inter';
import { ApiClientProvider } from '@robes/api-client/react';
import { ToastProvider } from '@robes/ui-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api } from '@/lib/api';

export default function RootLayout() {
  const [loaded] = useFonts({
    Cormorant_300Light,
    Cormorant_300Light_Italic,
    Cormorant_400Regular,
    Cormorant_400Regular_Italic,
    Inter_300Light,
    Inter_500Medium,
  });
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  );
  if (!loaded) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={api}>
        <View className="flex-1 bg-bg">
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="create" options={{ presentation: 'modal' }} />
            </Stack>
          </ToastProvider>
        </View>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
