import { nav } from '@robes/copy';
import { TabScreen } from '@/components/TabScreen';
import { TodayView } from '@/features/today/TodayView';

export default function Today() {
  return (
    <TabScreen title={nav.today}>
      <TodayView />
    </TabScreen>
  );
}
