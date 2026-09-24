import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { ingestReceipt, SesNotification } from '@robes/jobs';
import { workerContext } from '../context';

// `pnpm receipt:ingest <file.eml> --to <address>`: the SES inbound path without SES. Stores the
// raw mail in the local bucket under inbound/, then runs the same pipeline with passing verdicts.
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { to: { type: 'string' } },
});
const [file] = positionals;
if (!file || !values.to) {
  console.error('usage: pnpm receipt:ingest <file.eml> --to <address@in.domain>');
  process.exit(2);
}
const ctx = await workerContext();
try {
  if (!ctx.storage) throw new Error('set MEDIA_BUCKET (and the MinIO settings) in app/.env.local');
  const messageId = `local-${randomUUID()}`;
  const objectKey = `inbound/${messageId}`;
  await ctx.storage.putObject(objectKey, new Uint8Array(readFileSync(file)), {
    contentType: 'message/rfc822',
  });
  const pass = { status: 'PASS' };
  const outcome = await ingestReceipt(
    await ctx.inbound(),
    SesNotification.parse({
      notificationType: 'Received',
      mail: { messageId },
      receipt: {
        recipients: [values.to],
        spfVerdict: pass,
        dkimVerdict: pass,
        spamVerdict: pass,
        virusVerdict: pass,
        action: { type: 'S3', objectKey },
      },
    }),
  );
  console.info(JSON.stringify(outcome));
} finally {
  await ctx.close();
}
