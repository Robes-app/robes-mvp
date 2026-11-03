import { Icon } from '@robes/icons/web';
import Link from 'next/link';

// The return band's one pill: ‹ and the previous screen's own title (legacy nav architecture).
// AppShell draws it from lib/nav backFor: in the top bar in place of the wordmark below 768, at the
// head of the page from 768 (beta). A 32px pill on a 44pt target, as beta's #rb-backpill.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 shrink-0 items-center rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <span className="inline-flex h-8 items-center gap-1 rounded-pill border border-hairline bg-surface pr-3.5 pl-2.5 font-sans text-ink-muted text-sm group-hover:border-border-control group-hover:text-ink">
        <Icon name="back" size={16} />
        {label}
      </span>
    </Link>
  );
}
