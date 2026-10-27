import { you } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { Notifications } from '@/features/you/Notifications';

export default function NotificationsScreen() {
  return (
    <StackScreen settings title={you.notifications.title}>
      <Notifications />
    </StackScreen>
  );
}
