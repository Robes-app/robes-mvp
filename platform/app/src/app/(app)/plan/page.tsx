import { plan } from '@robes/copy';
import { PageHeader } from '@/components/page-header';
import { PlanView } from './plan-view';

export default function PlanPage() {
  return (
    <>
      <PageHeader title={plan.title} />
      <PlanView />
    </>
  );
}
