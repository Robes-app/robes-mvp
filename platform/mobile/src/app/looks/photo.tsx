import { useLocalSearchParams } from 'expo-router';
import { LookCapture } from '@/features/capture/LookCapture';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Capture a look (Capture PRD 1c): full screen and its own chrome — a viewfinder has no room for
// a header. From a day on Home it arrives with the day, which the draft it makes is saved to.
export default function LookCaptureRoute() {
  const { day } = useLocalSearchParams<{ day?: string }>();
  return <LookCapture day={day && ISO_DATE.test(day) ? day : null} />;
}
