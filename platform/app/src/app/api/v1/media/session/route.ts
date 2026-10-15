import { EmptyInput, MediaSession } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { cookies } from 'next/headers';
import { route } from '@/server/route';
import { uploadDeps } from '@/server/upload-deps';
import { startMediaSession } from '@/server/uploads';

export const POST = route({
  auth: 'user',
  input: EmptyInput,
  output: MediaSession,
  rateLimit: { key: 'media.session', limit: 30, windowSeconds: 60 },
  handler: async ({ user }) => {
    const jar = await cookies();
    return startMediaSession(uploadDeps, verifiedUserId(user.id), ({ name, value, ...opts }) =>
      jar.set(name, value, { ...opts, httpOnly: true, secure: true, sameSite: 'lax' }),
    );
  },
});
