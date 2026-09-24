import { redirect } from 'next/navigation';
import { requireProfile } from '@/server/session';
import { OnboardingForm } from './onboarding-form';

export default async function OnboardingPage() {
  const profile = await requireProfile();
  if (profile.onboardedAt) redirect('/');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <OnboardingForm initialFirstName={profile.firstName ?? ''} />
    </main>
  );
}
