import { twin } from '@robes/copy';
import { SettingsPage } from '@/components/settings/settings-chrome';
import { ObservationsView } from './observations-view';

export default function YouObservationsPage() {
  return (
    <SettingsPage title={twin.observations.title} back="/you" sub={twin.observations.sub}>
      <ObservationsView />
    </SettingsPage>
  );
}
