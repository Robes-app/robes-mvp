import { Icon } from '@robes/icons/web';
import Link from 'next/link';

// The return band's one pill: ‹ and the previous screen's own title (legacy nav architecture).
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-1 self-start rounded-pill border border-hairline bg-surface pr-4 pl-3 font-sans text-ink-muted text-sm hover:border-border-control hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <Icon name="back" size={16} />
      {label}
    </Link>
  );
}
