import { plan } from '@robes/copy';
import { PageHeader } from '@/components/page-header';
import { PlanList } from './plan-list';

export default function PlanPage() {
  return (
    <>
      <PageHeader title={plan.title} />
      <PlanList />
    </>
  );
}
