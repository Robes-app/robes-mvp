import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

// Same-origin: the Better Auth handler lives at /api/auth in this app.
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
