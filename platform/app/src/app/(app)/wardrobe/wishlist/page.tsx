import { wardrobe } from '@robes/copy';
import { WardrobePlaceholder } from '../placeholder';

export default function WishlistPage() {
  return <WardrobePlaceholder current="/wardrobe/wishlist" empty={wardrobe.wishlistEmpty} />;
}
