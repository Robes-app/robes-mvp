import { nav } from '@robes/copy';
import { useLocalSearchParams } from 'expo-router';
import { TabScreen } from '@/components/TabScreen';
import { DiaryHome } from '@/features/home/DiaryHome';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// The OOTD diary home (plan 2026-11-02); the bell's nudges land on their day.
export default function Today() {
  const { day } = useLocalSearchParams<{ day?: string }>();
  return (
    <TabScreen title={nav.today}>
      <DiaryHome day={day && ISO_DATE.test(day) ? day : null} />
    </TabScreen>
  );
}
