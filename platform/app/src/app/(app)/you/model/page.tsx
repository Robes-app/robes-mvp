import { twin } from '@robes/copy';
import { SettingsPage } from '@/components/settings/settings-chrome';
import { ModelView } from './model-view';

export default function YouModelPage() {
  return (
    <SettingsPage title={twin.twinPage.title} back="/you" wide>
      <ModelView />
    </SettingsPage>
  );
}
