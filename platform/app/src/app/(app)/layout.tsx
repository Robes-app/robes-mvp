import { AppShell } from '@/components/shell/app-shell';
import { clientFeatures } from '@/server/flags';
import { displayName, requireOnboardedProfile } from '@/server/session';

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireOnboardedProfile();
  return (
    <AppShell name={displayName(profile)} features={await clientFeatures()}>
      {children}
    </AppShell>
  );
}
