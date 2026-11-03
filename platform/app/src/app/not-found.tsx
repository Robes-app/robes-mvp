import { shell } from '@robes/copy';
import { buttonClasses, EmptyState } from '@robes/ui';
import Link from 'next/link';

// Every 404 (an unknown URL, a page's notFound()): one line and the way home; Next adds the
// noindex. Twin of native mobile/src/app/+not-found.tsx.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <EmptyState
        title={shell.notFound.title}
        action={
          <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
            {shell.notFound.back}
          </Link>
        }
      />
    </main>
  );
}
