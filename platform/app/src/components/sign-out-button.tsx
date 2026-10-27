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
      // Settings' foot (legacy .sp-out): a small hairline pill; its hit area stays 44.
      variant="secondary"
      className="relative min-h-9 px-5 after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
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
