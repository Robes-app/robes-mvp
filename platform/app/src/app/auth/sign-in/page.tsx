import { socialProviders } from '@/server/auth';
import { safeNext } from '@/server/guards';
import { AuthForm } from '../auth-form';
import { AuthShell } from '../auth-shell';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthShell>
      <AuthForm mode="sign-in" next={safeNext(next)} google={socialProviders.google} />
    </AuthShell>
  );
}
