import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger, scrub } from './index';

function capture() {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _enc, done) {
      lines.push(String(chunk));
      done();
    },
  });
  return { lines, logger: createLogger({ service: 'test', destination }) };
}

describe('logger (SEC-83)', () => {
  it('never writes emails, names or prompts', () => {
    const { lines, logger } = capture();
    logger.info(
      {
        userId: 'u1',
        email: 'niall@example.com',
        profile: { firstName: 'Niall', prompt: 'a red dress for my wedding' },
        err: new Error('duplicate key for niall@example.com'),
      },
      'signup failed for niall@example.com',
    );
    const out = lines.join('');
    expect(out).toContain('"userId":"u1"');
    expect(out).toContain('"service":"test"');
    for (const secret of ['niall@example.com', 'Niall', 'red dress'])
      expect(out).not.toContain(secret);
  });

  it('keeps structure while scrubbing', () => {
    expect(scrub({ a: [{ email: 'x@y.co' }, 'mail z@w.io'], n: 1 })).toEqual({
      a: [{ email: '[redacted]' }, 'mail [redacted]'],
      n: 1,
    });
  });
});
