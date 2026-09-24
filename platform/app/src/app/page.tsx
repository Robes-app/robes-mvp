import { marketing } from '@robes/copy';
import { buttonClasses, Eyebrow, Heading, Text } from '@robes/ui';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { WaitlistForm } from '@/components/marketing/waitlist-form';
import { AppShell } from '@/components/shell/app-shell';
import { TodayView } from '@/components/today/today-view';
import { env } from '@/server/env';
import { currentProfile, displayName } from '@/server/session';
import { loadToday } from '@/server/today';

export const metadata: Metadata = {
  title: marketing.metaTitle,
  description: marketing.metaDescription,
  openGraph: {
    title: marketing.metaTitle,
    description: marketing.metaDescription,
    type: 'website',
  },
  twitter: { card: 'summary', title: marketing.metaTitle, description: marketing.metaDescription },
};

// Signed out: the marketing page. Signed in: Today, inside the app shell.
export default async function Home() {
  const profile = await currentProfile();

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6">
        <Eyebrow>{marketing.eyebrow}</Eyebrow>
        <Heading level={1} size="2xl">
          {marketing.title}
        </Heading>
        <Text tone="muted">{marketing.subtitle}</Text>
        <Link
          href="/auth/sign-in"
          className={`${buttonClasses({ variant: 'primary' })} mt-4 self-start`}
        >
          {marketing.signIn}
        </Link>
        <div className="mt-12">
          <WaitlistForm
            siteKey={env.turnstile?.siteKey ?? null}
            nonce={(await headers()).get('x-nonce')}
          />
        </div>
      </main>
    );
  }

  if (!profile.onboardedAt) redirect('/onboarding');

  return (
    <AppShell name={displayName(profile)}>
      <TodayView initial={await loadToday(profile.userId)} />
    </AppShell>
  );
}
