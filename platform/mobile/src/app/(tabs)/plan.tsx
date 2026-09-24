import { nav } from '@robes/copy';
import { TabScreen } from '@/components/TabScreen';
import { PlanView } from '@/features/plan/PlanView';

export default function Plan() {
  return (
    <TabScreen title={nav.plan}>
      <PlanView />
    </TabScreen>
  );
}
