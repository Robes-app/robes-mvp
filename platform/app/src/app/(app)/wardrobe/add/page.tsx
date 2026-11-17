import { redirect } from 'next/navigation';
import { addPiecesHref, cameraHref, destinationOf } from '@/lib/add-hrefs';

// The old Add pieces address (emails, links, ⌘K before 16 Nov): the Add pieces sheet over the
// Wardrobe or the Wishlist, or the camera when it asked for one. The page with its own
// Wardrobe/Wishlist switch is retired (audit P2). Twin of native app/wardrobe/add.tsx.
export default async function AddPiecesRoute({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; start?: string }>;
}) {
  const { to, start } = await searchParams;
  const dest = destinationOf(to);
  redirect(start === 'camera' ? cameraHref(dest) : addPiecesHref(dest));
}
