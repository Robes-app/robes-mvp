'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { authClient } from '@/lib/auth-client';
import { useAnalytics } from './analytics-provider';

// The one sign-out (Settings' foot, and after asking to delete the account). Native twin:
// mobile/src/lib/use-sign-out.ts.
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  const { forget } = useAnalytics();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await authClient.signOut();
    forget();
    // Cached responses belong to the previous user.
    queryClient.clear();
    router.replace('/');
    router.refresh();
  }, [forget, queryClient, router]);
}
