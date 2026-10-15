// HTML → the text Robes reads (legacy inbox.js htmlToText). Scripts and styles go; a product image
// survives as "[image: url | alt]" so the model can hand it back as metadata; tracking pixels and
// icons are dropped up front. Nothing here is ever fetched.
const ENT: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  euro: '€',
  pound: '£',
  yen: '¥',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  middot: '·',
  bull: '•',
  times: '×',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e.startsWith('#')) {
      const n =
        e[1] === 'x' || e[1] === 'X'
          ? Number.parseInt(e.slice(2), 16)
          : Number.parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENT[e] ?? ENT[e.toLowerCase()] ?? m;
  });
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decodeEntities(m[2] ?? m[3] ?? m[4] ?? '') : '';
}

function isPixel(tag: string, src: string): boolean {
  const w = attr(tag, 'width');
  const h = attr(tag, 'height');
  if ((w && Number.parseInt(w, 10) <= 2) || (h && Number.parseInt(h, 10) <= 2)) return true;
  return /pixel|track|beacon|open\.gif|spacer|\.gif(\?|$)|logo|icon|badge|social|facebook|instagram|twitter|tiktok|pinterest|applepay|paypal|visa|mastercard/i.test(
    src,
  );
}

export function htmlToText(html: string, maxLen: number): string {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = attr(tag, 'src');
    if (!/^https?:\/\//i.test(src) || isPixel(tag, src)) return ' ';
    const alt = attr(tag, 'alt').replace(/[|\]]/g, ' ').trim();
    return `\n[image: ${src}${alt ? ` | ${alt}` : ''}]\n`;
  });
  s = s
    .replace(
      /<(br|p|div|tr|li|h[1-6]|table|section|article|header|footer|blockquote|dd|dt)\b[^>]*>/gi,
      '\n',
    )
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section|article)\b[^>]*>/gi, '\n')
    .replace(/<\/?(td|th)\b[^>]*>/gi, '  ')
    .replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s)
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}
