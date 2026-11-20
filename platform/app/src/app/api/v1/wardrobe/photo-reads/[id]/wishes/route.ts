import { FilePieceInput, PhotoReadParams, Wish } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { wishPiece } from '@/server/photo-reads';
import { route } from '@/server/route';

// Save to your wishlist on The Rack (TestFlight 20 Nov): one piece of her read becomes a wish
// holding its crop; the read's other pieces stay on the rack.
export const POST = route({
  auth: 'user',
  input: FilePieceInput,
  params: PhotoReadParams,
  output: Wish,
  rateLimit: { key: 'wardrobe.photoRead.wish', limit: 60, windowSeconds: 60 },
  handler: ({ user, input, params }) => wishPiece(verifiedUserId(user.id), params.id, input),
});
