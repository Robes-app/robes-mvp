import { consent as copy, you } from '@robes/copy';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { PrivacyForm } from './privacy-form';

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <BackLink href="/you" label={you.title} />
      <PageHeader eyebrow={copy.privacyEyebrow} title={copy.privacyTitle} />
      <PrivacyForm />
    </div>
  );
}
