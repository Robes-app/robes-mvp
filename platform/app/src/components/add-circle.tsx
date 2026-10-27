'use client';

import { Icon } from '@robes/icons/web';
import Link from 'next/link';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The 44pt + circle beside a tab's switcher (beta parity canvas): white on the fine rule-mid
// edge, a link or a button. The native twin is ui-native IconButton `framed`.
export function AddCircle(
  props: { label: string } & ({ href: string } | { onClick: () => void; expanded: boolean }),
) {
  const className = `inline-flex size-11 shrink-0 items-center justify-center rounded-pill border border-rule-mid bg-surface-raised text-ink hover:border-border-control ${focus}`;
  if ('href' in props) {
    return (
      <Link href={props.href} aria-label={props.label} title={props.label} className={className}>
        <Icon name="plus" size={18} />
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={props.label}
      aria-expanded={props.expanded}
      title={props.label}
      className={className}
    >
      <Icon name="plus" size={18} />
    </button>
  );
}
