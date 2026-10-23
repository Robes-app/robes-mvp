import { twin } from '@robes/copy';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { ColouringView } from './colouring-view';

export default function YouColouringPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <BackLink href="/you/model" label={twin.twinPage.title} />
      <PageHeader title={twin.twinPage.colouring} />
      <ColouringView />
    </div>
  );
}
