'use client';

import { ui } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useHideBack, usePushedView } from '@/components/shell/app-shell';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// A piece's page bar (Front Door canvas 3b, PRD §7.3): ‹ at the left, the piece's name centred in
// the serif as the page's h1, and the page's one control at the right (the Hero Rack star on a
// piece she owns). On a phone it stands in for the app's bar; the shell's back pill stands down.
// Shared by the piece and the wish pages. Native twin: features/wardrobe/PieceHeader.tsx.
export function PieceHeader({
  title,
  back,
  faint = false,
  trailing,
}: {
  title: string;
  // Where ‹ goes when there is no page behind (a deep link).
  back: string;
  // A name Robes hasn't read yet ("New piece"): a placeholder, not a fact.
  faint?: boolean;
  trailing?: ReactNode;
}) {
  usePushedView();
  useHideBack(true);
  const router = useRouter();
  return (
    <header
      data-testid="piece-header"
      className="relative -mx-5 -mt-3.5 flex h-16 items-center bg-bg px-3 md:mx-0 md:mt-0 md:px-0"
    >
      <button
        type="button"
        aria-label={ui.back}
        title={ui.back}
        onClick={() => (window.history.length > 1 ? router.back() : router.push(back))}
        className={`relative z-10 inline-flex size-11 items-center justify-center rounded-pill text-ink hover:bg-surface ${focus}`}
      >
        <Icon name="back" size={20} />
      </button>
      <h1
        className={`pointer-events-none absolute inset-x-16 truncate text-center font-display font-light text-[22px] ${
          faint ? 'text-ink-faint italic' : 'text-ink'
        }`}
      >
        {title}
      </h1>
      <div className="relative z-10 ml-auto">{trailing}</div>
    </header>
  );
}
