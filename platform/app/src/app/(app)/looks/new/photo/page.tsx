import { looks, photoPieces } from '@robes/copy';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { LookFromPhoto } from '@/components/photo-pieces/look-from-photo';

export default function LookFromPhotoPage() {
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/looks/new" label={looks.composer.eyebrow} />
      <PageHeader eyebrow={photoPieces.look.eyebrow} title={photoPieces.look.title} />
      <LookFromPhoto />
    </div>
  );
}
