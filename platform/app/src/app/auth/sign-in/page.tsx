import { socialProviders } from '@/server/auth';
import { safeNext } from '@/server/guards';
import { SignInForm } from './sign-in-form';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="warm-ground">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
        <SignInForm next={safeNext(next)} providers={socialProviders} />
      </main>
    </div>
  );
}
