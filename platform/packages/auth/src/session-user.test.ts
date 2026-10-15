import { describe, expect, it, vi } from 'vitest';
import { type Auth, sessionUser } from './index';

function fakeAuth(): { auth: Auth; getSession: ReturnType<typeof vi.fn> } {
  const getSession = vi.fn(async () => ({
    user: { id: 'u1', email: 'a@example.com', name: 'A' },
  }));
  return { auth: { api: { getSession } } as unknown as Auth, getSession };
}

describe('sessionUser', () => {
  it('answers anonymous requests without asking Better Auth (no database round trip)', async () => {
    const { auth, getSession } = fakeAuth();
    expect(await sessionUser(auth, new Headers())).toBeNull();
    expect(await sessionUser(auth, new Headers({ cookie: 'theme=dark' }))).toBeNull();
    expect(getSession).not.toHaveBeenCalled();
  });

  it('resolves a request carrying a session cookie (web or native, any prefix)', async () => {
    const { auth, getSession } = fakeAuth();
    const user = await sessionUser(auth, new Headers({ cookie: '__Secure-robes.session_token=x' }));
    expect(user).toEqual({ id: 'u1', email: 'a@example.com', name: 'A' });
    expect(getSession).toHaveBeenCalledOnce();
  });
});
