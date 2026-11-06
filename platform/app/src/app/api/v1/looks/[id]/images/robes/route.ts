import { Look, LookParams, LookRobesInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { keepsOneImage } from '@/server/look-images';
import { toLook } from '@/server/looks-entity';
import { route } from '@/server/route';

// Robes' picture off the stack, or back on it (D19). Hidden, it is kept, not destroyed, and her
// photograph in front leads the look; the next redraw that lands shows it again as the cover. A
// look always keeps one image: with no photograph of hers it can't be hidden (409
// look_needs_image).
export const POST = route({
  auth: 'user',
  input: LookRobesInput,
  params: LookParams,
  output: Look,
  rateLimit: { key: 'looks.images.robes', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    const row = await keepsOneImage(() =>
      repos.looks.setRobesHidden(userId, params.id, input.hidden),
    );
    return toLook(userId, row);
  },
});
