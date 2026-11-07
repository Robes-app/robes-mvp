'use client';

import { auth as copy } from '@robes/copy';
import { Button } from '@robes/ui';
import { useSignOut } from './use-sign-out';

// Felix SettingsView: a full-width outline Button under the Account card. It is an action, not a
// destination, so it has no chevron; its hit ring reaches 44.
export function SignOutButton() {
  const signOut = useSignOut();
  return (
    <Button variant="outline" block onClick={() => void signOut()}>
      {copy.signOut}
    </Button>
  );
}
