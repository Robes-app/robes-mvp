'use client';

import { Icon } from '@robes/icons/web';
import Link from 'next/link';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The 36pt + circle on row 1 (legacy .rb-hdr-add): a link, or a button on the wishlist.
export function AddCircle(
  props: { label: string } & ({ href: string } | { onClick: () => void; expanded: boolean }),
) {
  const className = `relative inline-flex size-9 shrink-0 items-center justify-center rounded-pill border border-border-control text-ink after:absolute after:-inset-1 hover:border-ink ${focus}`;
  if ('href' in props) {
    return (
      <Link href={props.href} aria-label={props.label} title={props.label} className={className}>
        <Icon name="plus" size={16} />
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
      <Icon name="plus" size={16} />
    </button>
  );
}
