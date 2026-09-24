import { looks, shell } from '@robes/copy';
import { buttonClasses } from '@robes/ui';
import Link from 'next/link';
import { IdeaGrid } from '@/components/looks/idea-grid';
import { LooksSegments } from '@/components/looks/looks-segments';
import { PageHeader } from '@/components/page-header';

export default function IdeasPage() {
  return (
    <>
      <PageHeader
        title={looks.title}
        actions={
          <Link href="/looks/style" className={buttonClasses({ variant: 'secondary' })}>
            {shell.create.stylePiece}
          </Link>
        }
      />
      <LooksSegments current="/looks/ideas" />
      <IdeaGrid />
    </>
  );
}
