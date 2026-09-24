import { you } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { Notifications } from '@/features/you/Notifications';

export default function NotificationsScreen() {
  return (
    <StackScreen title={you.notifications.title}>
      <Notifications />
    </StackScreen>
  );
}
