import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { LookFromPhoto } from '@/features/photo-pieces/LookFromPhoto';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Capture Look from a day on home (design 3k) arrives with the day and the camera already open.
export default function LookFromPhotoRoute() {
  const { day, start } = useLocalSearchParams<{ day?: string; start?: string }>();
  return (
    <StackScreen>
      <LookFromPhoto
        day={day && ISO_DATE.test(day) ? day : null}
        start={start === 'camera' ? 'camera' : null}
      />
    </StackScreen>
  );
}
