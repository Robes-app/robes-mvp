import type { Look } from '@robes/contracts';
import { looks } from '@robes/copy';
import { Card } from '@robes/ui';
import Link from 'next/link';
import { LookImage } from './look-image';

export function LookCard({ look, priority = false }: { look: Look; priority?: boolean }) {
  return (
    <Link
      href={`/look/${look.id}`}
      aria-label={look.name}
      className="block rounded-crisp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <Card
        as="article"
        media={<LookImage look={look} priority={priority} sizes="(min-width: 768px) 33vw, 50vw" />}
        title={look.name}
        meta={look.timesWorn > 0 ? looks.savedList.worn(look.timesWorn) : undefined}
      />
    </Link>
  );
}
