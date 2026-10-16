export interface AuthUser {
  id: string;
  email?: string;
}

// Resolves the signed-in user from the request (session cookie or Expo header); null if none.
export type ResolveUser = (req: Request) => Promise<AuthUser | null>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
