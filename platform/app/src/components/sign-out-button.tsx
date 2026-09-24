'use client';

import { auth as copy } from '@robes/copy';
import { Button } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="quiet"
      className="-mx-2"
      onClick={async () => {
        await authClient.signOut();
        router.replace('/');
        router.refresh();
      }}
    >
      {copy.signOut}
    </Button>
  );
}
