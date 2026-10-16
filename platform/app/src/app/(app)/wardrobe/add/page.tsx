import { photoPieces, wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import Link from 'next/link';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { AddPieces } from '@/components/wardrobe/add-pieces';

export default function AddPiecesPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <BackLink href="/wardrobe" label={wardrobe.title} />
      <PageHeader title={wardrobe.addPieces} />
      <AddPieces />
      {/* Several pieces from one photograph (legacy 2026-10-13): its own door beside the batch. */}
      <Link
        href="/wardrobe/add/photo"
        className="flex items-center gap-4 rounded-crisp border border-hairline px-5 py-4 outline-offset-2 hover:border-ink focus-visible:outline-2 focus-visible:outline-focus-ring"
      >
        <Icon name="camera" size={24} className="text-ink-muted" />
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="font-sans text-base text-ink">{photoPieces.door.title}</span>
          <span className="font-sans text-ink-muted text-sm">{photoPieces.door.body}</span>
        </span>
        <Icon name="forward" size={18} className="text-ink-muted" />
      </Link>
    </div>
  );
}
