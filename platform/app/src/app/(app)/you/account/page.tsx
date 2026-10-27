import { you } from '@robes/copy';
import { SettingsPage } from '@/components/settings/settings-chrome';
import { AccountForm } from './account-form';

export default function AccountPage() {
  return (
    <SettingsPage title={you.account.title} back="/you?tab=account">
      <div className="rounded-soft border border-hairline bg-surface-raised p-5">
        <AccountForm />
      </div>
    </SettingsPage>
  );
}
