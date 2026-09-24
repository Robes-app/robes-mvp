import { you } from '@robes/copy';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { NotificationsForm } from './notifications-form';

export default function NotificationsPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <BackLink href="/you" label={you.title} />
      <PageHeader title={you.notifications.title} />
      <NotificationsForm />
    </div>
  );
}
