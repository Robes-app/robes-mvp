import {
  COLOUR_FAMILIES,
  cleanPalette,
  PATTERNS,
  type Palette,
  type Preference,
  paletteFromWords,
  SHADES,
  shadePreference,
} from '../colour';

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const words = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

// Her palette, or (until she sets one) her free-text colour lists mapped into the model.
export function paletteOf(dna: unknown): Palette {
  const d = obj(dna);
  const p = cleanPalette(d.palette);
  if (Object.keys(p.fam).length + Object.keys(p.shade).length + Object.keys(p.print).length) {
    return p;
  }
  const uo = obj(d.user_overrides);
  const colours = obj(obj(d.brief).colours);
  return paletteFromWords(
    [...words(uo.loved_colors), ...words(colours.loved)],
    [...words(uo.rejected_colors), ...words(colours.rejected)],
  );
}

// Her colours and prints in the style prompt (legacy a61f211). Love is weighted up; avoid is
// SOFT: nothing new in it, but a piece she owns in it is still styled. A shade she set overrides
// its family. The typed hard nos stay the only absolutes.
export function paletteLines(dna: unknown): string[] {
  const p = paletteOf(dna);
  const side = (v: Preference): string[] => {
    const fams = COLOUR_FAMILIES.filter((f) => (p.fam[f.id] ?? 0) === v).map((f) => {
      const not = f.shades.filter((s) => s.id in p.shade && p.shade[s.id] !== v);
      return not.length
        ? `${f.name} (not ${not.map((s) => s.name.toLowerCase()).join(', ')})`
        : f.name;
    });
    const shades = SHADES.filter(
      (s) => (p.fam[s.family] ?? 0) !== v && shadePreference(p, s.id) === v,
    ).map((s) => s.name.toLowerCase());
    return [...fams, ...shades];
  };
  const prints = (v: Preference) =>
    PATTERNS.filter((x) => p.print[x.id] === v).map((x) => x.name.toLowerCase());
  const love = side(1);
  const avoid = side(-1);
  const lines: string[] = [];
  if (love.length) {
    lines.push(
      `HER COLOURS — the ones she loves: ${love.join(', ')}. Weight them up: reach for them first among her own pieces, and lead with them when a piece has to be found. These outrank the colouring read — a colour she loves is right whatever the archetype says.`,
    );
  }
  if (avoid.length) {
    lines.push(
      `COLOURS SHE'D RATHER NOT BUY — ${avoid.join(', ')}. Never propose a NEW piece in one, and never build a look around one. A piece she already owns in one is hers to wear: style it like any other, never single it out, never apologise for it. A shade she set overrides its family — loving Blues and avoiding cobalt means blues are weighted up and cobalt is never suggested.`,
    );
  }
  const pl = prints(1);
  const pa = prints(-1);
  if (pl.length) {
    lines.push(
      `PRINTS she loves: ${pl.join(', ')} — reach for them, among her pieces and in anything proposed.`,
    );
  }
  if (pa.length) {
    lines.push(
      `PRINTS she'd rather not buy: ${pa.join(', ')} — never a new piece in one; one she owns is styled like any other.`,
    );
  }
  return lines;
}
