// How the image prompts describe a look's garments (testing 19–21 Nov, a tester's looks): which
// layer goes over which, what to take from a photograph of her wearing a piece, and the shape
// that makes a piece what it is. Shared by the frame (style-piece) and the redraw (avatar).

// A top worn open over another top: the one second top a look may carry. A jumper or a knit is a
// top in its own right, never a layer over another (21 Nov: a raglan tee drawn cropped over a
// turtleneck). "Vest" is left out: in British English it is the undershirt.
const TOP_LAYER =
  /\b(cardigans?|overshirts?|shackets?|shirt[- ]jackets?|waistcoats?|gilets?|kimonos?)\b/i;

export function isTopLayer(name: string, categoryL2?: string | null): boolean {
  return TOP_LAYER.test(name) || TOP_LAYER.test(categoryL2 ?? '');
}

export interface Garment {
  name: string;
  category?: string | null;
  // What defines it, read from her photograph (silhouette_fit): "Strong shoulder", "Longline".
  shape?: readonly string[] | null;
}

const UNDER = new Set(['Tops', 'Dresses']);

// The layers from the skin out, named in order, whenever a look has more than one: the model
// otherwise layers them as it likes and reshapes a garment to make them fit (21 Nov: a grey crew
// jumper drawn as a V-neck over a polo neck). '' for a look of one layer.
export function layersLine(pieces: readonly Garment[]): string {
  const under = pieces.filter((p) => UNDER.has(p.category ?? '') && !isTopLayer(p.name));
  const mid = pieces.filter((p) => p.category === 'Tops' && isTopLayer(p.name));
  const outer = pieces.filter((p) => p.category === 'Outerwear');
  const order = [...under, ...mid, ...outer];
  if (order.length < 2) return '';
  const the = (p: Garment) => `the ${p.name.slice(0, 120)}`;
  const [first, ...rest] = order;
  const over = rest.map((p, i) =>
    i === rest.length - 1 && outer.includes(p)
      ? `then ${the(p)} as the outer layer`
      : `then ${the(p)} over it`,
  );
  return `LAYERS, from the skin out: ${the(first as Garment)}, ${over.join(', ')} — each layer clearly visible where it shows, never left out, and no garment reshaped to make them fit (keep every neckline, collar and length as it is).`;
}

const SHAPE_WORD = /^[\p{L}\p{N}][\p{L}\p{N} '’-]{0,29}$/u;

// What a piece's photograph read says of its shape, cleaned: at most four short descriptors.
export function shapeWords(shape: readonly string[] | null | undefined): string[] {
  return (shape ?? [])
    .map((s) => String(s).replace(/\s+/g, ' ').trim())
    .filter((s) => SHAPE_WORD.test(s))
    .slice(0, 4);
}

const FAITHFUL =
  '— reproduce this exact garment faithfully: its true colour, cut, fabric and details.';
const FROM_PHOTO =
  '— take ONLY this garment from that photograph, whoever wears it and whatever else it shows, and reproduce it faithfully: its true colour, cut, silhouette, fabric and details, never a generic version of it.';

// The garment list's lines: the first line of each piece, in order. They come before anything she
// wrote (her picture note goes at the end), so a note cannot pass for a garment.
function garmentLines(lines: readonly string[], n: number): number[] {
  const at = lines.flatMap((l, i) => (l.startsWith('- ') ? [i] : [])).slice(0, n);
  if (at.length !== n) throw new Error('garments: the garment list moved');
  return at;
}

// The garments of an image prompt, described for this look: each photographed piece is taken
// alone from its photograph (her pieces are often photographed on her, with the rest of an
// outfit), each piece names its shape when its read has one, and the layers are named in order
// straight after the list. Throws when the list and the pieces disagree, so a moved list fails
// its tests instead of describing the wrong garment.
export function dressGarments(prompt: string, pieces: readonly Garment[]): string {
  if (pieces.length === 0) return prompt;
  const lines = prompt.split('\n');
  const at = garmentLines(lines, pieces.length);
  pieces.forEach((p, k) => {
    const i = at[k] as number;
    let line = (lines[i] as string).replace(FAITHFUL, FROM_PHOTO);
    const shape = shapeWords(p.shape);
    if (shape.length) line = `${line} Its shape: ${shape.join(', ')}.`;
    lines[i] = line;
  });
  const layers = layersLine(pieces);
  if (layers) lines.splice((at[at.length - 1] as number) + 1, 0, layers);
  return lines.join('\n');
}
