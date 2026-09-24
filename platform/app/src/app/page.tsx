import { marketing, nav, today } from '@robes/copy';
import { buttonClasses, Eyebrow, Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SignOutButton } from '@/components/sign-out-button';
import { currentProfile } from '@/server/session';

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
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6">
      <Eyebrow>{nav.today}</Eyebrow>
      <Heading level={1} size="2xl">
        {today.greeting(profile.firstName, hour)}
      </Heading>
      <Text tone="muted">{today.nextStep}</Text>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </main>
  );
}
