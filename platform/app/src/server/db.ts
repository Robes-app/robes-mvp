import 'server-only';
import { createDb, createRepositories } from '@robes/db';
import { env } from './env';

export const db = createDb({ connectionString: env.DATABASE_URL, applicationName: 'robes-app' });
export const repos = createRepositories(db);
