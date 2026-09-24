import { you } from '@robes/copy';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { ModelView } from './model-view';

export default function YouModelPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <BackLink href="/you" label={you.title} />
      <PageHeader title={you.model.title} />
      <ModelView />
    </div>
  );
}
