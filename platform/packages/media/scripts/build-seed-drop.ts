// Builds a seeded drop from its sheet and pictures (plan "Seeded Christmas looks").
//
//   pnpm --filter @robes/media seed:drop <folder> [--upload]
//
// <folder> holds the sheet's three tabs exported as CSV (drop.csv, looks.csv, pieces.csv) and every
// picture the sheet names (<look-id>.jpg, <look-id>-<position>.jpg). Columns are read by header, so
// the sheet may move them. Each picture is rendered to catalog/seeds/<seed-id>/<name>/{master.jpg,
// <w>.avif, <w>.webp}: under ./out to look at, or into the media bucket with --upload (MEDIA_BUCKET,
// AWS_REGION and the role's own credentials). The drop's file is written to
// app/src/server/seeds/<seed-id>.ts; review it, and its header's words in @robes/copy, before a PR.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectImageFormat } from '../src/detect';
import { catalogRenditionKeys } from '../src/manifest';
import { renderImage } from '../src/render';
import { createMediaBucket, createMediaStorage } from '../src/storage';

const [folder, flag] = process.argv.slice(2);
if (!folder) {
  console.error('usage: seed:drop <folder> [--upload]');
  process.exit(1);
}
const upload = flag === '--upload';
const bucket = process.env.MEDIA_BUCKET;
const region = process.env.AWS_REGION;
if (upload && (!bucket || !region)) {
  console.error('--upload needs MEDIA_BUCKET and AWS_REGION');
  process.exit(1);
}
const storage =
  upload && bucket && region ? createMediaStorage(createMediaBucket({ bucket, region })) : null;

// RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes.
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim()));
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

// The sheet's words, mapped to the app's own lists; anything else stops the build by name.
const TAGS: Record<string, string> = { party: 'Occasion', evening: 'Evening', day: 'Everyday' };
const SEASONS: Record<string, string[]> = {
  'all year': [],
  'autumn & winter': ['autumn', 'winter'],
  winter: ['winter'],
  autumn: ['autumn'],
  'spring & summer': ['spring', 'summer'],
  summer: ['summer'],
  spring: ['spring'],
};
const CATEGORIES: Record<string, string> = {
  tops: 'Tops',
  knitwear: 'Tops',
  bottoms: 'Bottoms',
  dresses: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  bags: 'Bags',
  accessories: 'Accessories',
  jewellery: 'Accessories',
};
function categoryOf(sheet: string, name: string): string {
  const key = sheet.toLowerCase();
  if (key === 'tailoring & suiting') {
    return /blazer|jacket|coat|waistcoat/i.test(name) ? 'Outerwear' : 'Bottoms';
  }
  const category = CATEGORIES[key];
  if (!category) throw new Error(`${name}: unknown category "${sheet}"`);
  return category;
}
const need = (row: Record<string, string>, key: string, what: string): string => {
  const value = row[key];
  if (!value) throw new Error(`${what}: no ${key}`);
  return value;
};
const price = (value: string | undefined) => {
  if (!value) return undefined;
  const n = Number(value.replace(/[^0-9.]/g, ''));
  return n > 0 ? Math.round(n) : undefined;
};
const url = (value: string | undefined) => value || null;

async function render(file: string, base: string) {
  const input = new Uint8Array(await readFile(join(folder as string, file)));
  const format = detectImageFormat(input);
  if (!format) throw new Error(`${file}: not an image`);
  const rendered = await renderImage(input, format);
  const widths = [...new Set(rendered.renditions.map((r) => r.width))];
  const manifest = {
    v: 1 as const,
    master: { width: rendered.master.width, height: rendered.master.height },
    widths,
  };
  const keys = catalogRenditionKeys(base, manifest);
  const files: [string, Uint8Array, string][] = [[keys.master, rendered.master.data, 'image/jpeg']];
  for (const r of rendered.renditions) {
    const key = keys.renditions.find((k) => k.width === r.width)?.[r.format];
    if (key) files.push([key, r.data, `image/${r.format}`]);
  }
  for (const [key, data, contentType] of files) {
    if (storage) {
      await storage.putObject(key, data, {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      });
    } else {
      await mkdir(join('out', key, '..'), { recursive: true });
      await writeFile(join('out', key), data);
    }
  }
  return {
    width: rendered.master.width,
    height: rendered.master.height,
    blurhash: rendered.blurhash,
    widths,
  };
}

async function exists(file: string) {
  return readFile(join(folder as string, file)).then(
    () => true,
    () => false,
  );
}

const csv = async (name: string) => parseCsv(await readFile(join(folder, name), 'utf8'));
const [dropRow] = await csv('drop.csv');
if (!dropRow) throw new Error('drop.csv: no row');
const seedId = need(dropRow, 'seed_id', 'drop');
const looksRows = (await csv('looks.csv')).sort((a, b) => Number(a.order) - Number(b.order));
const piecesRows = await csv('pieces.csv');

const looks = [];
for (const row of looksRows) {
  const lookId = need(row, 'look_id', 'look');
  const seasons = SEASONS[(row.seasons ?? '').toLowerCase()];
  const tag = TAGS[(row.tag ?? '').toLowerCase()];
  if (!seasons) throw new Error(`${lookId}: unknown seasons "${row.seasons}"`);
  if (!tag) throw new Error(`${lookId}: unknown tag "${row.tag}"`);
  const base = `catalog/seeds/${seedId}/${lookId}`;
  const pieces = [];
  // An empty name is an unused slot: the sheet pre-lists six per look.
  const rows = piecesRows
    .filter((p) => p.look_id === lookId && p.name)
    .sort((a, b) => Number(a.position) - Number(b.position));
  for (const [i, p] of rows.entries()) {
    const name = need(p, 'name', lookId);
    const picture = p.image && (await exists(p.image)) ? p.image : null;
    if (p.image && !picture)
      console.error(`${lookId} ${name}: no ${p.image}, shown without a still`);
    pieces.push({
      name,
      category: categoryOf(need(p, 'category', name), name),
      brand: p.brand ?? '',
      prices: { EUR: price(p.price_eur), GBP: price(p.price_gbp) },
      urls: { uk: url(p.product_url_uk), ie: url(p.product_url_ie) },
      // Stills key by their place among the pieces kept, as landing reads them.
      image: picture ? await render(picture, `${base}-${i + 1}`) : null,
    });
  }
  looks.push({
    lookId,
    name: need(row, 'caption', lookId).replace(/\.$/, ''),
    tags: [tag],
    seasons,
    image: await render(need(row, 'image', lookId), base),
    pieces,
  });
  console.error(`${lookId}: ${pieces.length} pieces ${storage ? 'uploaded' : 'written to ./out'}`);
}

const drop = {
  seedId,
  liveFrom: need(dropRow, 'live_from', 'drop'),
  liveUntil: need(dropRow, 'live_until', 'drop'),
  looks,
};
const name = seedId.toUpperCase().replace(/-/g, '_');
const out = resolve(
  dirname(fileURLToPath(import.meta.url)),
  `../../../app/src/server/seeds/${seedId}.ts`,
);
await writeFile(
  out,
  `import { SeedDrop } from '@robes/contracts';

// Generated by \`pnpm --filter @robes/media seed:drop\` from the drop's sheet and pictures: re-run
// it rather than editing by hand. Header words: lookbook.seedDrops['${seedId}'] in @robes/copy.
export const ${name} = SeedDrop.parse(${JSON.stringify(drop, null, 2)});
`,
);
console.error(`wrote ${out}`);
