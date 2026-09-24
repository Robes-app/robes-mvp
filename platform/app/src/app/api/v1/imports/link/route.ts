import { ImportLinkInput, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { startLinkImport } from '@/server/imports';
import { route } from '@/server/route';

// Paste a link: the isolated fetcher reads the page and the product lands in her Inbox (SEC-40).
export const POST = route({
  auth: 'user',
  input: ImportLinkInput,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'imports.link', limit: 20, windowSeconds: 3600 },
  handler: ({ user, req, input }) => startLinkImport(verifiedUserId(user.id), req, input),
});
