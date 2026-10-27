import { you } from '@robes/copy';
import { SettingsPage } from '@/components/settings/settings-chrome';
import { DownloadData } from '../download-data';
import { PrivacyForm } from './privacy-form';

export default function PrivacyPage() {
  return (
    <SettingsPage title={you.privacy} back="/you?tab=account">
      <div className="flex flex-col gap-[26px]">
        <PrivacyForm />
        <DownloadData />
      </div>
    </SettingsPage>
  );
}
