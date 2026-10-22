import { nav } from '@robes/copy';
import { useLocalSearchParams } from 'expo-router';
import { TabScreen } from '@/components/TabScreen';
import { HomeView } from '@/features/home/HomeView';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function Today() {
  const { dress } = useLocalSearchParams<{ dress?: string }>();
  return (
    <TabScreen title={nav.today}>
      <HomeView dress={dress && ISO_DATE.test(dress) ? dress : null} />
    </TabScreen>
  );
}
