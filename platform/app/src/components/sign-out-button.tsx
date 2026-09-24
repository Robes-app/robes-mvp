'use client';

import { auth as copy } from '@robes/copy';
import { Button } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useAnalytics } from './analytics-provider';

export function SignOutButton() {
  const router = useRouter();
  const { forget } = useAnalytics();
  const queryClient = useQueryClient();
  return (
    <Button
      variant="quiet"
      className="-mx-2"
      onClick={async () => {
        await authClient.signOut();
        forget();
        // Cached responses belong to the previous user.
        queryClient.clear();
        router.replace('/');
        router.refresh();
      }}
    >
      {copy.signOut}
    </Button>
  );
}
