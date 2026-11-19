import {
  FIRST_RUN_VERSION,
  FirstRunCapture,
  type FirstRunFlowStep,
  firstRunResume,
} from '@robes/contracts';
import { GENDER_IDENTITIES } from '@robes/core/avatar';
import { STYLE_TYPES, type StyleType } from '@robes/core/style-dna';
import { redirect } from 'next/navigation';
import { requireProfile } from '@/server/session';
import { OnboardingForm } from './onboarding-form';
import type { Identity } from './steps';

// Getting to know you: done once she has finished the flow (an account onboarded
// before walks it once). Her step and, past Brands or on a re-run, her answers come from her
// profile.
export default async function OnboardingPage() {
  const profile = await requireProfile();
  if (profile.onboardedAt && (profile.firstRunVersion ?? 0) >= FIRST_RUN_VERSION) redirect('/');
  const saved = FirstRunCapture.safeParse(profile.firstRunStep).data;
  const step = saved ? (firstRunResume(saved) as FirstRunCapture & FirstRunFlowStep) : null;
  const answered = profile.onboardedAt !== null || profile.firstRunStep !== null;
  const identity = (GENDER_IDENTITIES as readonly string[]).includes(profile.genderIdentity ?? '')
    ? (profile.genderIdentity as Identity)
    : null;
  return (
    <OnboardingForm
      initialFirstName={profile.firstName ?? ''}
      start={{
        step,
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
