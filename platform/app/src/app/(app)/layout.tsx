import { AppShell } from '@/components/shell/app-shell';
import { UsageAsk } from '@/components/usage-ask';
import { clientFeatures } from '@/server/flags';
import { currentConsents, displayName, requireOnboardedProfile } from '@/server/session';

// `drawer` is the parallel slot the draft look opens in over the current screen (D14): see
// app/(app)/@drawer.
export default async function SignedInLayout({
  children,
  drawer,
}: {
  children: React.ReactNode;
  drawer: React.ReactNode;
}) {
  const profile = await requireOnboardedProfile();
  const session = await currentConsents();
  return (
    <AppShell name={displayName(profile)} features={await clientFeatures()}>
      {children}
      {drawer}
      {session ? <UsageAsk current={session.consents} /> : null}
    </AppShell>
  );
}
