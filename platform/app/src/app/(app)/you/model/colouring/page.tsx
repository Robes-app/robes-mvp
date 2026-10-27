import { twin } from '@robes/copy';
import { SettingsPage } from '@/components/settings/settings-chrome';
import { ColouringView } from './colouring-view';

export default function YouColouringPage() {
  return (
    <SettingsPage title={twin.twinPage.colouring} back="/you/model" narrow>
      <ColouringView />
    </SettingsPage>
  );
}
