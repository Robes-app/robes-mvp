import { looks, photoPieces } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import Link from 'next/link';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { Composer } from './composer';

export default function NewLookPage() {
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/looks" label={looks.title} />
      <PageHeader eyebrow={looks.composer.eyebrow} title={looks.composer.title} />
      {/* A look from a photo (legacy use case 2b): the second start beside the rack. */}
      <Link
        href="/looks/new/photo"
        className="flex items-center gap-4 rounded-crisp border border-border-control border-dashed px-5 py-4 outline-offset-2 hover:border-ink focus-visible:outline-2 focus-visible:outline-focus-ring"
      >
        <Icon name="camera" size={24} className="text-ink-muted" />
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="font-sans text-base text-ink">{photoPieces.look.start.title}</span>
          <span className="font-sans text-ink-muted text-sm">{photoPieces.look.start.body}</span>
        </span>
        <Icon name="forward" size={18} className="text-ink-muted" />
      </Link>
      <Composer />
    </div>
  );
}
