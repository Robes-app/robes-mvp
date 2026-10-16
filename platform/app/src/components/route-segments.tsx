'use client';

import { SegmentedControl } from '@robes/ui';
import { useRouter } from 'next/navigation';

// Segments that are routes (Wardrobe › Pieces/Wishlist/Inbox, Looks › Saved/Ideas).
export function RouteSegments({
  label,
  options,
  current,
}: {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  current: string;
}) {
  const router = useRouter();
  return (
    <SegmentedControl
      label={label}
      options={options}
      value={current}
      onChange={(href) => router.push(href)}
      className="mb-6"
    />
  );
}
