import { twin, you } from '@robes/copy';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { ModelView } from './model-view';

export default function YouModelPage() {
  return (
    <div className="mx-auto max-w-2xl">
      {/* The header pair alone is a stack: the hero below it is flush under it on the phone. */}
      <div className="flex flex-col gap-4">
        <BackLink href="/you" label={you.title} />
        <PageHeader title={twin.twinPage.title} />
      </div>
      <ModelView />
    </div>
  );
}
