import { marketing } from '@robes/copy';
import { buttonClasses, Eyebrow, Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { TodayView } from '@/components/today/today-view';
import { currentProfile, displayName } from '@/server/session';
import { loadToday } from '@/server/today';

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
