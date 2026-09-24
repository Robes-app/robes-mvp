import { ApiClientProvider } from '@robes/api-client/react';
import { ToastProvider } from '@robes/ui-native';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function Providers({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={api}>
          <ToastProvider>{children}</ToastProvider>
        </ApiClientProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
