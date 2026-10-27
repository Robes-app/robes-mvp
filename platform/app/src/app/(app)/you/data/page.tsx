import { you } from '@robes/copy';
import { SettingsPage } from '@/components/settings/settings-chrome';
import { DownloadData } from '../download-data';

export default function DataPage() {
  return (
    <SettingsPage title={you.dataExport.title} back="/you?tab=account">
      <DownloadData />
    </SettingsPage>
  );
}
