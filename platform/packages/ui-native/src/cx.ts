import { extendTailwindMerge } from 'tailwind-merge';

// A component's defaults (`text-base`, `text-ink-faint`) sit before the caller's class. Uniwind
// on iOS/Android lets the later plain class win, but on web CSS order decides, so a default could
// beat the caller's `text-lg`. Merging drops the earlier class of a conflicting pair: the last one
// wins everywhere and the class list says what renders. A size keeps a `leading-*` (Tailwind 4
// lets it win). Twin of web ui cn.ts.
const merge = extendTailwindMerge({ override: { conflictingClassGroups: { 'font-size': [] } } });

export function cx(...parts: Array<string | false | null | undefined>): string {
  return merge(parts.filter(Boolean).join(' '));
}
