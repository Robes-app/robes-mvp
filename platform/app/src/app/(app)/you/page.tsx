import { twin, you } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Avatar, Eyebrow, Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { SignOutButton } from '@/components/sign-out-button';
import { displayName, requireOnboardedProfile } from '@/server/session';
import { DeleteAccount } from './delete-account';
import { DownloadData } from './download-data';
import { ForwardReceipts } from './forward-receipts';
import { StyleProfileTab } from './style-profile-tab';
import { YouTabs } from './you-tabs';

const row =
  'flex min-h-12 items-center justify-between gap-4 border-b border-hairline font-sans text-base text-ink hover:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

function RowLink({ href, label, sub }: { href: string; label: string; sub?: string }) {
  return (
    <li>
      <Link href={href} className={`${row} py-3`}>
        <span className="flex flex-col gap-0.5">
          {label}
          {sub ? <span className="text-ink-muted text-sm">{sub}</span> : null}
        </span>
        <Icon name="forward" size={16} className="shrink-0 text-ink-muted" />
      </Link>
    </li>
  );
}

function Group({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <Eyebrow id={id}>{title}</Eyebrow>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

// The avatar's door (legacy Settings): Style Profile | Account.
export default async function YouPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await requireOnboardedProfile();
  const { tab } = await searchParams;
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
      <YouTabs
        initial={tab === 'account' ? 'account' : 'style'}
        style={<StyleProfileTab />}
        account={
          <div className="flex flex-col gap-8">
            <Group id="you-profile" title={you.sections.profile}>
              <RowLink href="/you/account" label={you.account.title} sub={you.subs.account} />
            </Group>
            <Group id="you-notifications" title={you.sections.notifications}>
              <RowLink
                href="/you/notifications"
                label={you.notifications.title}
                sub={you.subs.notifications}
              />
            </Group>
            <Group id="you-privacy" title={you.sections.privacy}>
              <RowLink href="/you/privacy" label={you.privacy} sub={you.subs.privacy} />
              <RowLink href="/legal/terms" label={you.legal.terms} sub={you.subs.terms} />
              <RowLink href="/legal/privacy" label={you.legal.privacyNotice} />
            </Group>
            <ForwardReceipts />
            <DownloadData />
            <div className="flex flex-col items-start gap-4">
              <SignOutButton />
              <DeleteAccount />
            </div>
            <Text size="small" tone="muted">
              {you.help}{' '}
              <a href={`mailto:${you.helpEmail}`} className="text-ink underline underline-offset-4">
                {you.helpEmail}
              </a>
            </Text>
          </div>
        }
        labels={twin.tabs}
      />
    </div>
  );
}
