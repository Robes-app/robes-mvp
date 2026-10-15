import { nav } from '@robes/copy';
import { TabScreen } from '@/components/TabScreen';
import { HomeView } from '@/features/home/HomeView';

export default function Today() {
  return (
    <TabScreen title={nav.today}>
      <HomeView />
    </TabScreen>
  );
}
