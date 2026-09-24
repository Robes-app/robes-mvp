import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { api } from './api';
import { authClient } from './auth-client';
import { unregisterPush } from './push';

export function useSignOut(): () => Promise<void> {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    // While the session still exists, so the server knows whose device this was.
    await unregisterPush(api);
    await authClient.signOut();
    // Cached responses belong to the previous user.
    queryClient.clear();
    router.replace('/sign-in');
  }, [queryClient, router]);
}
