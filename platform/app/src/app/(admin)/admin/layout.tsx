import { admin as copy } from '@robes/copy';
import { Eyebrow } from '@robes/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/server/session';

export const metadata: Metadata = { title: 'Admin · Robes', robots: { index: false } };

const LINKS = [
  ['/admin', copy.nav.overview],
  ['/admin/users', copy.nav.users],
  ['/admin/costs', copy.nav.costs],
  ['/admin/flags', copy.nav.flags],
  ['/admin/audit', copy.nav.audit],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <nav
        aria-label={copy.nav.label}
        className="flex flex-wrap items-center gap-6 border-b border-hairline pb-4"
      >
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        {LINKS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="font-sans text-sm text-ink underline-offset-4 hover:underline"
          >
            {label}
          </Link>
        ))}
      </nav>
      <main className="flex flex-col gap-8">{children}</main>
    </div>
  );
}
