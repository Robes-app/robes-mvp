'use client';

import { twin, you } from '@robes/copy';
import { DrillList, DrillRowContent, drillRowClass } from '@robes/ui';
import { DrillLink } from '@/components/settings/settings-chrome';
import { useNotifications } from '@/components/shell/bell';
import { SignOutButton } from '@/components/sign-out-button';
import { DeleteAccount } from './delete-account';

// Account (Felix SettingsView): one drill card holding every row the tab had before (Annie, 7 Nov)
// — the pages behind them keep their routes — then Sign out, the outline button 24px under it.
// Notifications carries "2 new" while anything waits behind the bell. Native twin:
// mobile/src/features/you/YouMenu.tsx Account.
export function AccountTab({ name, email }: { name: string; email: string }) {
  const waiting = useNotifications().data?.items.length ?? 0;
  return (
    <div className="flex flex-col gap-6">
      <DrillList label={twin.tabs.account}>
        <DrillLink
          href="/you/account"
          label={you.rows.details}
          value={name || twin.dnaPage.notYet}
          muted={!name}
        />
        <div className={drillRowClass}>
          <DrillRowContent label={you.account.email} value={email} trailing={null} />
        </div>
        <DrillLink
          href="/you/notifications"
          label={you.rows.notifications}
          {...(waiting ? { value: you.rows.newAlerts(waiting) } : {})}
        />
        <DrillLink href="/you/receipts" label={you.rows.receipts} />
        <DrillLink href="/you/privacy" label={you.rows.privacy} />
        <DrillLink href="/legal/privacy" external label={you.legal.privacyNotice} />
        <DrillLink href="/legal/terms" external label={you.legal.terms} />
        <DrillLink href={`mailto:${you.helpEmail}`} label={you.rows.help} value={you.helpEmail} />
        <DeleteAccount />
      </DrillList>
      <SignOutButton />
    </div>
  );
}
