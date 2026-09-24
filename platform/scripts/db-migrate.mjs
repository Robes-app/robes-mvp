import { adminServerUrl, dbmate, isLocal } from './lib/dbmate.mjs';

// Applies pending migrations as the admin role. In CI/deploy DATABASE_ADMIN_URL includes the db name.
const url = process.env.DATABASE_ADMIN_URL ?? `${adminServerUrl()}/robes`;
dbmate(isLocal(url) && !url.includes('sslmode') ? `${url}?sslmode=disable` : url, 'up');
