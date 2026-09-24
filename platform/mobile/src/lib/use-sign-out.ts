import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { authClient } from './auth-client';

export function useSignOut(): () => Promise<void> {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    await authClient.signOut();
    // Cached responses belong to the previous user.
    queryClient.clear();
    router.replace('/sign-in');
  }, [queryClient, router]);
}
