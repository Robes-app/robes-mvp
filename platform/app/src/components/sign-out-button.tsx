'use client';

import { auth as copy } from '@robes/copy';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
      onClick={async () => {
        await authClient.signOut();
        router.replace('/');
        router.refresh();
      }}
    >
      {copy.signOut}
    </button>
  );
}
