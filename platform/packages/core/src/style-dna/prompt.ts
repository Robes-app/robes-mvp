// Style DNA → the prompt block injected into every stylist call (legacy PRD §6).
// Reads stored jsonb, so every field is checked: malformed data drops a line, never throws.

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | undefined =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : undefined;
const list = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : undefined;
const join = (v: unknown, sep = ', '): string => (list(v) ?? []).join(sep);

export function styleDnaPromptBlock(
  styleDna: unknown,
  wardrobeCount = 0,
  styleIcons: unknown = [],
): string {
  const icons = (list(styleIcons) ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  const dna = obj(styleDna) ?? {};
  const ch = obj(dna.color_harmony);
  const sp = obj(dna.silhouette_proportions);
  if (!ch && !sp && !icons.length) return '';
  const lines: string[] = [];
  // Style icons are her declared taste, layered over the photo-verified DNA.
  if (icons.length) {
    lines.push(
      `STYLE ICONS — the user named these as their taste references: ${icons.join(', ')}.`,
    );
    lines.push(
      'Follow the aesthetic of these icons and the brands they stand for — their signature silhouettes, styling codes, sensibility and the houses they are dressed by — as the north star for every recommendation. Choices should feel pulled from these icons’ world, adapted to the user’s verified constraints below; never contradict the colour or silhouette rules to imitate an icon.',
    );
  }
  if (!ch && !sp) return lines.join('\n');
  lines.push('STYLE DNA — verified styling constraints for this user:');
  if (ch) {
    const sub = obj(ch.functional_sub_palettes) ?? {};
    lines.push(
      `Colour archetype: ${ch.archetype_name} (undertone ${ch.verified_undertone}, contrast ${ch.calculated_contrast}).`,
    );
    if (list(sub.best_neutrals)) lines.push(`Foundation neutrals: ${join(sub.best_neutrals)}.`);
    if (list(sub.primary_stars)) {
      lines.push(
        `Star colours: ${join(sub.primary_stars)}. Accents: ${join(sub.secondary_accents)}.`,
      );
    }
    if (list(sub.avoid_list)) lines.push(`Never style them in: ${join(sub.avoid_list)}.`);
    const metals = obj(ch.metals_rules);
    if (metals) {
      lines.push(
        `Metals: ${join(metals.approved_metals)} (${metals.finish_type}); never ${join(metals.prohibited_metals)}.`,
      );
    }
  }
  if (sp) {
    const ar = obj(sp.architectural_rules) ?? {};
    lines.push(
      `Body architecture: ${sp.body_type}. Best dress silhouettes: ${join(ar.dress_silhouettes)}. Best necklines: ${join(ar.necklines)}.`,
    );
    if (list(ar.styling_maxims)) lines.push(`Styling maxims: ${join(ar.styling_maxims, ' ')}`);
  }
  // Her corrections always outrank the photo-derived profile.
  const uo = obj(dna.user_overrides) ?? {};
  const loved = list(uo.loved_colors);
  if (loved?.length) {
    lines.push(
      `The user has personally confirmed these colours work on them (they override the avoid list on conflict): ${loved.join(', ')}.`,
    );
  }
  const rejected = list(uo.rejected_colors);
  if (rejected?.length) {
    lines.push(
      `The user has personally rejected these colours — never style them in: ${rejected.join(', ')}.`,
    );
  }
  const measurements = obj(uo.measurements);
  if (measurements) {
    const m = Object.entries(measurements)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(', ');
    if (m) {
      lines.push(
        `Exact measurements supplied by the user — trust these over any photo estimate: ${m}.`,
      );
    }
  }
  lines.push(
    wardrobeCount >= 15
      ? `SYSTEM DIRECTIVE: The user has a mature digital closet (${wardrobeCount} items). Strictly optimise for mix-and-match modularity, combining their verified closet foundations with new pieces that obey the silhouette maxims above.`
      : wardrobeCount > 0
        ? `SYSTEM DIRECTIVE: The user is building their digital closet (${wardrobeCount}/15 items). Lead with fashion-house execution matching the colour and silhouette rules above, but weave in the pieces they already own by their exact labels wherever an owned piece genuinely serves the look — an owned piece always beats a hypothetical one. Fill the remaining gaps with ideal editorial combinations.`
        : 'SYSTEM DIRECTIVE: The user has not catalogued any wardrobe pieces yet — focus on fashion-house execution matching the colour archetype and silhouette rules above, producing ideal editorial combinations.',
  );
  return lines.join('\n');
}
