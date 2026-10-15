import { redirect } from 'next/navigation';
import { requireProfile } from '@/server/session';
import { OnboardingForm } from './onboarding-form';

export default async function OnboardingPage() {
  const profile = await requireProfile();
  if (profile.onboardedAt) redirect('/');
  return <OnboardingForm initialFirstName={profile.firstName ?? ''} />;
}
