import { useApi } from '@robes/api-client/react';
import { FIRST_RUN_VERSION, type Me } from '@robes/contracts';
import { authClient } from './auth-client';

export type Gate =
  | { state: 'loading' }
  | { state: 'signed-out' }
  | { state: 'onboarding'; me: Me }
  | { state: 'ready'; me: Me };

// Ready once she has finished the eight-step Getting to know you (onboarding PRD, 17 Nov): an
// account onboarded before it walks the new flow once too (Annie, 17 Nov: re-run for everyone).
export const firstRunDone = (me: Me): boolean =>
  me.onboarded && (me.firstRun.version ?? 0) >= FIRST_RUN_VERSION;

// One decision for every signed-in root: session → /me → onboarded.
export function useAuthGate(): Gate {
  const session = authClient.useSession();
  const signedIn = Boolean(session.data);
  const { data: me } = useApi('me.get', undefined, { enabled: signedIn });
  if (session.isPending) return { state: 'loading' };
  if (!signedIn) return { state: 'signed-out' };
  if (!me) return { state: 'loading' };
  return firstRunDone(me) ? { state: 'ready', me } : { state: 'onboarding', me };
}
