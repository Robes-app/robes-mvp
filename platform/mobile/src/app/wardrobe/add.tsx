import { Redirect, useLocalSearchParams } from 'expo-router';
import { addPiecesHref, destinationOf } from '@/features/wardrobe/add/flow';

// The old Add pieces address (emails, links): the Wardrobe with the Add pieces sheet up, filing to
// `?to=` (wishlist opens on the Wishlist).
export default function AddPiecesRoute() {
  const { to } = useLocalSearchParams<{ to?: string }>();
  return <Redirect href={addPiecesHref(destinationOf(to))} />;
}
