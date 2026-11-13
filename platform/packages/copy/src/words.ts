// Small helpers the copy modules share.
// profiles.gender_identity (@robes/core/avatar GENDER_IDENTITIES). Non-binary and "Prefer not to
// say" both read as they/them.
export type Presence = 'woman' | 'man' | 'non_binary' | 'unspecified';
export const asThey = (p: Presence | undefined): boolean =>
  p === 'unspecified' || p === 'non_binary';

const COUNT_WORDS = [
  'No',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
] as const;

// Sentence-leading counts read as words up to fifteen ("Seven pieces filed."), digits after.
export function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}
