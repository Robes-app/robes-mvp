import '../global.css';
import { Cormorant_300Light } from '@expo-google-fonts/cormorant';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { ApiClientProvider } from '@robes/api-client/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function RootLayout() {
  const [loaded] = useFonts({ Cormorant_300Light, Inter_400Regular, Inter_500Medium });
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  );
  if (!loaded) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={api}>
        <Stack screenOptions={{ headerShown: false }} />
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
