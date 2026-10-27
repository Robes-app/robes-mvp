import { twin, you } from '@robes/copy';
import { Eyebrow, Text } from '@robes/ui';
import { SettingsGroup, SettingsPage, SettingsRow } from '@/components/settings/settings-chrome';
import { SignOutButton } from '@/components/sign-out-button';
import { requireOnboardedProfile } from '@/server/session';
import { DeleteAccount } from './delete-account';
import { NotificationsForm } from './notifications/notifications-form';
import { StyleProfileTab } from './style-profile-tab';
import { YouTabs } from './you-tabs';

// The avatar's door (legacy Settings, 2026-10-08 redlines): one header row reading Settings,
// Style Profile | Account, and on Account her answers printed on white rows. Native twin:
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
    <SettingsPage title={you.settings} back="/">
      <YouTabs
        initial={tab === 'account' ? 'account' : 'style'}
        style={<StyleProfileTab />}
        account={
          <div className="flex flex-col gap-[26px]">
            <SettingsGroup id="you-profile" title={you.sections.profile}>
              <SettingsRow
                href="/you/account"
                label={you.account.name}
                value={name || twin.dnaPage.notYet}
                empty={!name}
              />
              <SettingsRow label={you.account.email} value={profile.email} />
              <DeleteAccount />
            </SettingsGroup>
            <SettingsGroup id="you-notifications" title={you.sections.notifications}>
              <NotificationsForm />
              <SettingsRow
                href="/you/receipts"
                label={you.receipts.title}
                sub={you.subs.receipts}
              />
            </SettingsGroup>
            <SettingsGroup id="you-privacy" title={you.sections.privacy}>
              {/* One row for her data: her consents and the download sit inside it (27 Oct). */}
              <SettingsRow href="/you/privacy" label={you.privacy} />
              <SettingsRow
                href="/legal/privacy"
                external
                label={you.legal.privacyNotice}
                sub={you.subs.privacy}
              />
              <SettingsRow
                href="/legal/terms"
                external
                label={you.legal.betaTerms}
                sub={you.subs.terms}
              />
            </SettingsGroup>
            <footer className="mt-1 flex flex-col items-center gap-2.5 text-center">
              <Text size="small" tone="muted">
                {you.help}{' '}
                <a
                  href={`mailto:${you.helpEmail}`}
                  className="text-ink underline underline-offset-4"
                >
                  {you.helpEmail}
                </a>
              </Text>
              <Eyebrow className="text-[9.5px]">{you.version}</Eyebrow>
              <SignOutButton />
            </footer>
          </div>
        }
        labels={twin.tabs}
      />
    </SettingsPage>
  );
}
