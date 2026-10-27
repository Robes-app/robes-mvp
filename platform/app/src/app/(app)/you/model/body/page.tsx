import { twin } from '@robes/copy';
import { SettingsPage } from '@/components/settings/settings-chrome';
import { BodyView } from './body-view';

export default function YouBodyShapePage() {
  return (
    <SettingsPage title={twin.twinPage.bodyShape} back="/you/model" narrow>
      <BodyView />
    </SettingsPage>
  );
}
