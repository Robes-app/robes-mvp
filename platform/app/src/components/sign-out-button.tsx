'use client';

import { auth as copy } from '@robes/copy';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return (
    <button
      type="button"
      className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
      onClick={async () => {
        await authClient.signOut();
        // Cached responses belong to the previous user.
        queryClient.clear();
        router.replace('/');
        router.refresh();
      }}
    >
      {copy.signOut}
    </button>
  );
}
