import { wardrobe } from '@robes/copy';
import { RouteSegments } from '../route-segments';

const OPTIONS = [
  { value: '/wardrobe', label: wardrobe.segments.pieces },
  { value: '/wardrobe/wishlist', label: wardrobe.segments.wishlist },
  { value: '/wardrobe/inbox', label: wardrobe.segments.inbox },
] as const;

export function WardrobeSegments({ current }: { current: (typeof OPTIONS)[number]['value'] }) {
  return <RouteSegments label={wardrobe.title} options={OPTIONS} current={current} />;
}
