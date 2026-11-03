'use client';

import { auth as copy } from '@robes/copy';
import { Button } from '@robes/ui';
import { useSignOut } from './use-sign-out';

export function SignOutButton() {
  const signOut = useSignOut();
  return (
    <Button
      // Settings' foot (legacy .sp-out): a small hairline pill; its hit area stays 44.
      variant="secondary"
      className="relative min-h-9 px-5 after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
      onClick={() => void signOut()}
    >
      {copy.signOut}
    </Button>
  );
}
