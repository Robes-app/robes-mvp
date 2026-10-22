// A line Robes drafted, shown as a sentence: capital first, closed with a full stop (voice rules).
export function asSentence(text: string): string {
  const t = text.trim();
  if (!t) return t;
  const capped = t[0]?.toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(capped) ? capped : `${capped}.`;
}
