import { wardrobe } from '@robes/copy';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { AddPieces } from '@/components/wardrobe/add-pieces';

export default function AddPiecesPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <BackLink href="/wardrobe" label={wardrobe.title} />
      <PageHeader title={wardrobe.addPieces} />
      <AddPieces />
    </div>
  );
}
