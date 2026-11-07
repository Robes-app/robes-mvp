import { twin, you } from '@robes/copy';
import { SettingsPage } from '@/components/settings/settings-chrome';
import { requireOnboardedProfile } from '@/server/session';
import { AccountTab } from './account-tab';
import { StyleProfileTab } from './style-profile-tab';
import { YouTabs } from './you-tabs';

// The avatar's door (Felix SettingsView): the subview header reading Settings, Style profile ·
// Account as underline Tabs, and each tab one drill card. Native twin:
// mobile/src/features/you/YouMenu.tsx.
export default async function YouPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await requireOnboardedProfile();
  const { tab } = await searchParams;
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  return (
    <SettingsPage title={you.settings} back="/" subview>
      <YouTabs
        initial={tab === 'account' ? 'account' : 'style'}
        style={<StyleProfileTab />}
        account={<AccountTab name={name} email={profile.email} />}
        labels={twin.tabs}
      />
    </SettingsPage>
  );
}
