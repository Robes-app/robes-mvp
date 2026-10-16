import { notFound } from 'next/navigation';
import { env } from '@/server/env';
import { requireProfile } from '@/server/session';
import { UploadForm } from './upload-form';

// Dev tooling: exercises upload → rendition → signed delivery locally. 404 in deployed envs.
export default async function DevUploadPage() {
  if (env.APP_ENV !== 'dev') notFound();
  await requireProfile();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <UploadForm />
    </main>
  );
}
