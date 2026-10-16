// A user id that came from a verified session. Only the auth layer mints these, so a repository
// can't be called with an id taken from a request body.
export type UserId = string & { readonly __brand: 'UserId' };

export function verifiedUserId(id: string): UserId {
  return id as UserId;
}
