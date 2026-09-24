'use client';

import { auth as copy } from '@robes/copy';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useAnalytics } from './analytics-provider';

export function SignOutButton() {
  const router = useRouter();
  const { forget } = useAnalytics();
  return (
    <button
      type="button"
      className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
      onClick={async () => {
        await authClient.signOut();
        forget();
        router.replace('/');
        router.refresh();
      }}
    >
      {copy.signOut}
    </button>
  );
}
