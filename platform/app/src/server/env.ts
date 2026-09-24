import 'server-only';
import { appServerEnv, parseEnv } from '@robes/config';

export const env = parseEnv(appServerEnv, process.env);
