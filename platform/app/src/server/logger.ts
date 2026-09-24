import 'server-only';
import { createLogger } from '@robes/logger';

export const logger = createLogger({
  service: 'robes-app',
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
});
