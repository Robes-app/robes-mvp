import { shell } from '@robes/copy';
import { buttonClasses, EmptyState } from '@robes/ui';
import Link from 'next/link';
import { PageHeader } from './page-header';

// One placeholder for every door that isn't built yet (IA §3.2).
export function Soon({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} />
      <EmptyState
        title={shell.soon.title}
        body={shell.soon.body}
        action={
          <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
            {shell.soon.back}
          </Link>
        }
      />
    </div>
  );
}
