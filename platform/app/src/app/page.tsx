import { marketing } from '@robes/copy';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { DiaryHome } from '@/components/home/diary-home';
import { AppShell } from '@/components/shell/app-shell';
import { UsageAsk } from '@/components/usage-ask';
import { socialProviders } from '@/server/auth';
import { env } from '@/server/env';
import { clientFeatures } from '@/server/flags';
import { currentConsents, currentProfile, displayName } from '@/server/session';
import { loadToday } from '@/server/today';
import { AuthForm } from './auth/auth-form';
import { AuthShell } from './auth/auth-shell';

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

// Signed out: sign up (design "Sign in and sign up", 18 Nov), the same screen as /auth/sign-up.
// Signed in: Today, inside the app shell.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ day?: string | string[]; saved?: string | string[] }>;
}) {
  const profile = await currentProfile();

  if (!profile) {
    return (
      <AuthShell>
        <script type="application/ld+json">{JSON_LD}</script>
        <AuthForm mode="sign-up" next="/" google={socialProviders.google} />
      </AuthShell>
    );
  }

  if (!profile.onboardedAt) redirect('/onboarding');

  const params = await searchParams;
  const session = await currentConsents();
  return (
    <AppShell name={displayName(profile)} features={await clientFeatures()}>
      {/* The OOTD diary home (plan 2026-11-02); the bell's nudges land on their day. */}
      <DiaryHome
        initial={await loadToday(profile.userId)}
        day={z.iso.date().safeParse(params.day).data ?? null}
        saved={z.uuid().safeParse(params.saved).data ?? null}
      />
      {/* Home sits outside (app), so it mounts the usage ask itself (see (app)/layout.tsx). */}
      {session ? <UsageAsk current={session.consents} /> : null}
    </AppShell>
  );
}
