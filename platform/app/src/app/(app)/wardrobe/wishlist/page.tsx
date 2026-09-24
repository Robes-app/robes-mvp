import { wardrobe } from '@robes/copy';
import { PageHeader } from '@/components/page-header';
import { WardrobeSegments } from '@/components/wardrobe/wardrobe-segments';
import { Wishlist } from '@/components/wardrobe/wishlist';

export default function WishlistPage() {
  return (
    <>
      <PageHeader title={wardrobe.title} />
      <WardrobeSegments current="/wardrobe/wishlist" />
      <Wishlist />
    </>
  );
}
