import { Icon } from '@robes/icons/web';
import Link from 'next/link';

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-1 self-start font-sans text-sm text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <Icon name="back" size={16} />
      {label}
    </Link>
  );
}
