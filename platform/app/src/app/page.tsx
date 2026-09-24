import { looks, marketing, nav, today } from '@robes/copy';
import { buttonClasses, Eyebrow, Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { currentProfile, displayName } from '@/server/session';

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

  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: profile.timezone,
    }).format(new Date()),
  );
  return (
    <AppShell name={displayName(profile)}>
      <section className="flex max-w-2xl flex-col gap-4 py-8">
        <Eyebrow>{nav.today}</Eyebrow>
        <Heading level={1} size="2xl">
          {today.greeting(profile.firstName, hour)}
        </Heading>
        <Text tone="muted">{today.nextStep}</Text>
        <Link
          href="/looks/style"
          className={`${buttonClasses({ variant: 'primary' })} mt-4 self-start`}
        >
          {looks.stylePiece.eyebrow}
        </Link>
      </section>
    </AppShell>
  );
}
