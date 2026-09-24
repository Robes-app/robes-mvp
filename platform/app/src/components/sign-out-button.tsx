'use client';

import { auth as copy } from '@robes/copy';
import { Button } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useAnalytics } from './analytics-provider';

export function SignOutButton() {
  const router = useRouter();
  const { forget } = useAnalytics();
  return (
    <Button
      variant="quiet"
      className="-mx-2"
      onClick={async () => {
        await authClient.signOut();
        forget();
        router.replace('/');
        router.refresh();
      }}
    >
      {copy.signOut}
    </Button>
  );
}
