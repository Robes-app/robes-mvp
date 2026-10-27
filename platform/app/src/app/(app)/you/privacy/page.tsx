import { you } from '@robes/copy';
import { SettingsPage } from '@/components/settings/settings-chrome';
import { PrivacyForm } from './privacy-form';

export default function PrivacyPage() {
  return (
    <SettingsPage title={you.privacy} back="/you?tab=account">
      <PrivacyForm />
    </SettingsPage>
  );
}
