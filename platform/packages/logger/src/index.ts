import pino, { type DestinationStream, type Logger } from 'pino';

import { scrub } from './scrub';

export { REDACTED_KEYS, scrub, scrubBreadcrumb, scrubEvent } from './scrub';

export interface LoggerOptions {
  service: string;
  level?: pino.LevelWithSilent;
  destination?: DestinationStream;
}

export function createLogger(opts: LoggerOptions): Logger {
  return pino(
    {
      level: opts.level ?? 'info',
      base: { service: opts.service },
      messageKey: 'msg',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
        log: (obj) => scrub(obj) as Record<string, unknown>,
      },
      hooks: {
        logMethod(args, method) {
          // Scrub interpolated message strings too.
          method.apply(
            this,
            args.map((a) => (typeof a === 'string' ? (scrub(a) as string) : a)) as never,
          );
        },
      },
    },
    opts.destination,
  );
}

export type { Logger };
