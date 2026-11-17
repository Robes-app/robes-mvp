import { FIRST_RUN_VERSION, FirstRunCapture } from '@robes/contracts';
import { GENDER_IDENTITIES } from '@robes/core/avatar';
import { STYLE_TYPES, type StyleType } from '@robes/core/style-dna';
import { redirect } from 'next/navigation';
import { READ_PARAM } from '@/lib/selfie-params';
import { requireProfile } from '@/server/session';
import { OnboardingForm } from './onboarding-form';
import type { Identity } from './steps';

// Getting to know you: done once she has finished the eight-step flow (an account onboarded
// before walks it once). Her step and, past Brands or on a re-run, her answers come from her
// profile.
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  if (profile.onboardedAt && (profile.firstRunVersion ?? 0) >= FIRST_RUN_VERSION) redirect('/');
  const params = await searchParams;
  const step = FirstRunCapture.safeParse(profile.firstRunStep).data ?? null;
  const answered = profile.onboardedAt !== null || profile.firstRunStep !== null;
  const identity = (GENDER_IDENTITIES as readonly string[]).includes(profile.genderIdentity ?? '')
    ? (profile.genderIdentity as Identity)
    : null;
  return (
    <OnboardingForm
      initialFirstName={profile.firstName ?? ''}
      start={{
        step,
        twin: typeof params[READ_PARAM] === 'string',
        skipped: profile.firstRunSkipped.flatMap((s) => FirstRunCapture.safeParse(s).data ?? []),
        identity: answered ? identity : null,
        styles: answered
          ? (profile.styleArchetypes ?? []).filter((t): t is StyleType =>
              (STYLE_TYPES as readonly string[]).includes(t),
            )
          : [],
        brands: answered ? (profile.styleBrands ?? []) : [],
      }}
    />
  );
}
