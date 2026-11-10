'use client';

import { wardrobe } from '@robes/copy';
import type { AddDestination } from '@robes/core/add-flow';
import { Button, buttonClasses, Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { wardrobeHref } from '@/lib/add-flow';

const copy = wardrobe.add;

// Filed (design 3a), after a piece added without a photo: how many, in words, one line on where
// they are, and the way on. Photographs and links end on the wardrobe itself under a toast
// (Capture PRD 3c.5).
export function Filed({
  to,
  kept,
  onAnother,
}: {
  to: AddDestination;
  kept: number;
  onAnother?: (() => void) | undefined;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-10">
      {/* The region announces the outcome; the h1 stays a heading inside it. */}
      <div role="status" className="flex flex-col gap-3">
        <Heading level={1} size="lg">
          {kept ? (
            <>
              {copy.filed.head(kept)} <em>{copy.filed.wink}</em>
            </>
          ) : (
            copy.filed.none
          )}
        </Heading>
        {kept ? (
          <Text tone="muted">
            {to === 'wishlist' ? copy.filed.line.wishlist(kept) : copy.filed.line.wardrobe}
          </Text>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        <Link
          href={wardrobeHref(to)}
          className={buttonClasses({ variant: 'primary', block: true })}
        >
          {copy.filed.see[to]}
        </Link>
        {onAnother ? (
          <Button variant="outline" onClick={onAnother}>
            {copy.filed.another}
          </Button>
        ) : (
          <Link
            href={`/wardrobe/add?to=${to}`}
            className={buttonClasses({ variant: 'outline', block: true })}
          >
            {copy.filed.another}
          </Link>
        )}
      </div>
    </div>
  );
}
