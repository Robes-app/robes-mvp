import { extendTailwindMerge } from 'tailwind-merge';

// Tailwind orders its CSS by utility name, not by the class list, so a component's default
// (`text-base`, `text-ink-faint`, `font-sans`) could beat the caller's `text-2xl`. Merging drops
// the earlier class of a conflicting pair: the last one wins. A size keeps a `leading-*`
// (Tailwind 4 lets it win). Twin of native ui-native cx.ts.
const merge = extendTailwindMerge({ override: { conflictingClassGroups: { 'font-size': [] } } });

export function cn(...parts: Array<string | false | null | undefined>): string {
  return merge(parts.filter(Boolean).join(' '));
}

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
