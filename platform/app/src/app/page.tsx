import { marketing, nav, today } from '@robes/copy';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SignOutButton } from '@/components/sign-out-button';
import { currentProfile } from '@/server/session';

export default async function Home() {
  const profile = await currentProfile();

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-ink-muted">
          {marketing.eyebrow}
        </p>
        <h1 className="font-display text-5xl font-light text-ink">{marketing.title}</h1>
        <p className="text-ink-muted">{marketing.subtitle}</p>
        <Link
          href="/auth/sign-in"
          className="mt-4 self-start rounded-pill bg-ink px-6 py-3 text-sm font-medium text-bg"
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
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-ink-muted">{nav.today}</p>
      <h1 className="font-display text-5xl font-light text-ink">
        {today.greeting(profile.firstName, hour)}
      </h1>
      <p className="text-ink-muted">{today.nextStep}</p>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </main>
  );
}
