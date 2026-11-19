// Sign up's optional first name (design "Sign in and sign up", 18 Nov). It is saved after the code
// is verified, and only onto an account that has no name yet: signing up with an email that
// already has an account never renames her.
export function signUpFirstName(typed: string, current: string | null | undefined): string | null {
  const first = typed.trim().split(/\s+/)[0];
  if (!first || current?.trim()) return null;
  return first;
}
