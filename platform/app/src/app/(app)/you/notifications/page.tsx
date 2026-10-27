import { you } from '@robes/copy';
import { SettingsGroup, SettingsPage } from '@/components/settings/settings-chrome';
import { NotificationsForm } from './notifications-form';

export default function NotificationsPage() {
  return (
    <SettingsPage title={you.notifications.title} back="/you?tab=account">
      <SettingsGroup>
        <NotificationsForm />
      </SettingsGroup>
    </SettingsPage>
  );
}
