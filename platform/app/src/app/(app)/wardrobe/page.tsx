import { wardrobe } from '@robes/copy';
import { buttonClasses } from '@robes/ui';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { PieceGrid } from '@/components/wardrobe/piece-grid';
import { WardrobeSegments } from '@/components/wardrobe/wardrobe-segments';

export default function WardrobePage() {
  return (
    <>
      <PageHeader
        title={wardrobe.title}
        actions={
          <Link href="/wardrobe/add" className={buttonClasses({ variant: 'secondary' })}>
            {wardrobe.addPieces}
          </Link>
        }
      />
      <WardrobeSegments current="/wardrobe" />
      <PieceGrid />
    </>
  );
}
