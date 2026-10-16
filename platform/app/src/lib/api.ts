import { createApiClient } from '@robes/api-client';

// Same-origin: the Better Auth session cookie rides along; never add tokens here.
export const api = createApiClient({ baseUrl: '', credentials: 'same-origin' });
