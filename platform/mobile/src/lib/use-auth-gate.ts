import { useApi } from '@robes/api-client/react';
import type { Me } from '@robes/contracts';
import { authClient } from './auth-client';

export type Gate =
  | { state: 'loading' }
  | { state: 'signed-out' }
  | { state: 'onboarding'; me: Me }
  | { state: 'ready'; me: Me };

// One decision for every signed-in root: session → /me → onboarded.
export function useAuthGate(): Gate {
  const session = authClient.useSession();
  const signedIn = Boolean(session.data);
  const { data: me } = useApi('me.get', undefined, { enabled: signedIn });
  if (session.isPending) return { state: 'loading' };
  if (!signedIn) return { state: 'signed-out' };
  if (!me) return { state: 'loading' };
  return me.onboarded ? { state: 'ready', me } : { state: 'onboarding', me };
}
