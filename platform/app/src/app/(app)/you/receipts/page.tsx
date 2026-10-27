import { you } from '@robes/copy';
import { SettingsPage } from '@/components/settings/settings-chrome';
import { ForwardReceipts } from '../forward-receipts';

// Account › Forward receipts (the native twin: mobile/src/app/you/receipts.tsx).
export default function ReceiptsPage() {
  return (
    <SettingsPage title={you.receipts.title} back="/you?tab=account">
      <ForwardReceipts />
    </SettingsPage>
  );
}
