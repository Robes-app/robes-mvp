import { twin } from '@robes/copy';
import { SettingsPage } from '@/components/settings/settings-chrome';
import { DnaView } from './dna-view';

export default function YouStylePage() {
  return (
    <SettingsPage title={twin.dnaPage.title} back="/you" sub={twin.dnaPage.sub}>
      <DnaView />
    </SettingsPage>
  );
}
