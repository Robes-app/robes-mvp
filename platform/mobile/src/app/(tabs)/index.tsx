import { useLocalSearchParams } from 'expo-router';
import { TabScreen } from '@/components/TabScreen';
import { DiaryHome } from '@/features/home/DiaryHome';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The OOTD diary home (plan 2026-11-02); the bell's nudges land on their day.
export default function Today() {
  const { day, saved } = useLocalSearchParams<{ day?: string; saved?: string }>();
  return (
    <TabScreen>
      <DiaryHome
        day={day && ISO_DATE.test(day) ? day : null}
        saved={saved && UUID.test(saved) ? saved : null}
      />
    </TabScreen>
  );
}
