import { looks } from '@robes/copy';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { Composer } from './composer';

export default function NewLookPage() {
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/looks" label={looks.title} />
      <PageHeader eyebrow={looks.composer.eyebrow} title={looks.composer.title} />
      <Composer />
    </div>
  );
}
