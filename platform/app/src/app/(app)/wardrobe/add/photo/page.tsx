import { photoPieces, wardrobe } from '@robes/copy';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { WardrobePieces } from '@/components/photo-pieces/wardrobe-pieces';

export default function SeveralPiecesPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <BackLink href="/wardrobe/add" label={wardrobe.addPieces} />
      <PageHeader title={photoPieces.door.title} />
      <WardrobePieces />
    </div>
  );
}
