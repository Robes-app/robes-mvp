import { marketing } from '@robes/copy';
import { buttonClasses, Heading, Text, Wordmark } from '@robes/ui';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { HomeView } from '@/components/home/home-view';
import { WaitlistForm } from '@/components/marketing/waitlist-form';
import { AppShell } from '@/components/shell/app-shell';
import { env } from '@/server/env';
import { clientFeatures } from '@/server/flags';
import { currentProfile, displayName } from '@/server/session';
import { loadToday } from '@/server/today';

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(env.BETTER_AUTH_URL),
    title: marketing.metaTitle,
    description: marketing.metaDescription,
    openGraph: {
      title: marketing.ogTitle,
      description: marketing.ogDescription,
      type: 'website',
      url: '/',
    },
    twitter: { card: 'summary', title: marketing.ogTitle, description: marketing.ogDescription },
  };
}

// Structured data for search (legacy landing head, main 05d9093); a data block, never executed.
const JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: marketing.eyebrow,
  operatingSystem: 'Web, iOS, Android',
  applicationCategory: 'LifestyleApplication',
  offers: { '@type': 'Offer', price: '0.00', priceCurrency: 'USD' },
  description: marketing.metaDescription,
}).replace(/</g, '\\u003c');

// Signed out: the marketing page. Signed in: Today, inside the app shell.
export default async function Home() {
  const profile = await currentProfile();

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6">
        <script type="application/ld+json">{JSON_LD}</script>
        <Wordmark />
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
    <AppShell name={displayName(profile)} features={await clientFeatures()}>
      <HomeView initial={await loadToday(profile.userId)} />
    </AppShell>
  );
}
