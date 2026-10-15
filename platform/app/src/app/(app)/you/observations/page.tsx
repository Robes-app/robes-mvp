import { twin, you } from '@robes/copy';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { ObservationsView } from './observations-view';

export default function YouObservationsPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <BackLink href="/you" label={you.title} />
      <PageHeader title={twin.observations.title} />
      <ObservationsView />
    </div>
  );
}
