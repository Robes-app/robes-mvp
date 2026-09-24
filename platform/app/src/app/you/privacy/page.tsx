import { consent as copy } from '@robes/copy';
import Link from 'next/link';
import { requireProfile } from '@/server/session';
import { PrivacyForm } from './privacy-form';

// Minimal consent controls until the full You area lands in M2.
export default async function PrivacyPage() {
  await requireProfile();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-ink-muted">
          {copy.privacyEyebrow}
        </p>
        <h1 className="font-display text-4xl font-light text-ink">{copy.privacyTitle}</h1>
      </header>
      <PrivacyForm />
      <Link href="/" className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink">
        {copy.back}
      </Link>
    </main>
  );
}
