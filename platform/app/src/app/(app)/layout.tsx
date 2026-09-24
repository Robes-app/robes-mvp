import { AppShell } from '@/components/shell/app-shell';
import { displayName, requireOnboardedProfile } from '@/server/session';

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireOnboardedProfile();
  return <AppShell name={displayName(profile)}>{children}</AppShell>;
}
