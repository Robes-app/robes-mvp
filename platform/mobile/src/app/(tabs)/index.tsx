import { nav } from '@robes/copy';
import { useLocalSearchParams } from 'expo-router';
import { TabScreen } from '@/components/TabScreen';
import { DiaryHome } from '@/features/home/DiaryHome';
import { HomeView } from '@/features/home/HomeView';
import { useFeatures } from '@/lib/features';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function Today() {
  const { dress, day } = useLocalSearchParams<{ dress?: string; day?: string }>();
  const { features, ready } = useFeatures();
  return (
    <TabScreen title={nav.today}>
      {/* Until the flags answer, nothing: the old home never flashes before the diary. */}
      {!ready ? null : features.homeDiary ? (
        // The OOTD diary home (plan 2026-11-02); the bell's nudges land on their day.
        <DiaryHome day={day && ISO_DATE.test(day) ? day : null} />
      ) : (
        <HomeView dress={dress && ISO_DATE.test(dress) ? dress : null} />
      )}
    </TabScreen>
  );
}
