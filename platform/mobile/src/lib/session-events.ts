import { ApiClientError } from '@robes/api-client';

// What a server answer says about the session itself, heard once for every query and mutation
// (audit F6): 401, the session is gone; 426, this app is too old for the server.
type SessionEvent = 'expired' | 'upgrade';
const listeners = new Set<(event: SessionEvent) => void>();

export function onSessionEvent(listener: (event: SessionEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function noteApiError(error: unknown): void {
  if (!(error instanceof ApiClientError)) return;
  const event = error.status === 401 ? 'expired' : error.status === 426 ? 'upgrade' : null;
  if (!event) return;
  for (const l of listeners) l(event);
}
