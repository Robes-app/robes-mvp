import { you } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Avatar, Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { SignOutButton } from '@/components/sign-out-button';
import { displayName, requireOnboardedProfile } from '@/server/session';
import { DeleteAccount } from './delete-account';
import { DownloadData } from './download-data';

const row =
  'flex min-h-12 items-center justify-between gap-4 border-b border-hairline font-sans text-base text-ink hover:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className={row}>
        {label}
        <Icon name="forward" size={16} className="text-ink-muted" />
      </Link>
    </li>
  );
}

export default async function YouPage() {
  const profile = await requireOnboardedProfile();
  const name = displayName(profile);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <header className="flex items-center gap-4">
        <Avatar name={name} size="lg" />
        <div className="flex flex-col gap-1">
          <Heading level={1} size="lg">
            {you.title}
          </Heading>
          <Text size="small" tone="muted">
            {profile.email}
          </Text>
        </div>
      </header>
      <ul className="flex flex-col">
        <RowLink href="/you/style" label={you.style.link} />
        <RowLink href="/you/account" label={you.account.title} />
        <RowLink href="/you/notifications" label={you.notifications.title} />
        <RowLink href="/you/privacy" label={you.privacy} />
      </ul>
      <section aria-labelledby="you-legal" className="flex flex-col gap-2">
        <Heading level={2} size="sm" id="you-legal">
          {you.legal.title}
        </Heading>
        <ul className="flex flex-col">
          <RowLink href="/legal/terms" label={you.legal.terms} />
          <RowLink href="/legal/privacy" label={you.legal.privacyNotice} />
        </ul>
      </section>
      <DownloadData />
      <div className="flex flex-col items-start gap-4">
        <SignOutButton />
        <DeleteAccount />
      </div>
    </div>
  );
}
