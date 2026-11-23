// Renders a seeded drop's look pictures into the shared catalog (plan "Seeded Christmas looks").
//
//   pnpm --filter @robes/media seed:images <seed-id> <folder of <look-id>.jpg> [--upload]
//
// Each picture becomes catalog/seeds/<seed-id>/<look-id>/{master.jpg, <w>.avif, <w>.webp}, the
// layout catalogRenditionKeys reads. Without --upload the files are written under ./out for a look;
// with it they go to the media bucket (MEDIA_BUCKET, AWS_REGION, and the role's own credentials).
// It prints each look's `image` for the drop's file in app/src/server/seeds.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { detectImageFormat } from '../src/detect';
import { catalogRenditionKeys } from '../src/manifest';
import { renderImage } from '../src/render';
import { createMediaBucket, createMediaStorage } from '../src/storage';

const [seedId, folder, flag] = process.argv.slice(2);
const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;
if (!seedId || !SLUG.test(seedId) || !folder) {
  console.error('usage: seed:images <seed-id> <folder> [--upload]');
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
const IMMUTABLE = 'public, max-age=31536000, immutable';

const images: Record<string, unknown> = {};
for (const file of (await readdir(folder)).sort()) {
  const lookId = file.replace(/\.(jpe?g|png|webp)$/i, '');
  if (lookId === file || !SLUG.test(lookId)) continue;
  const input = new Uint8Array(await readFile(join(folder, file)));
  const format = detectImageFormat(input);
  if (!format) throw new Error(`${file}: not an image`);
  const rendered = await renderImage(input, format);
  const widths = [...new Set(rendered.renditions.map((r) => r.width))];
  const manifest = {
    v: 1 as const,
    master: { width: rendered.master.width, height: rendered.master.height },
    widths,
  };
  const keys = catalogRenditionKeys(`catalog/seeds/${seedId}/${lookId}`, manifest);
  const files: [string, Uint8Array, string][] = [[keys.master, rendered.master.data, 'image/jpeg']];
  for (const r of rendered.renditions) {
    const key = keys.renditions.find((k) => k.width === r.width)?.[r.format];
    if (key) files.push([key, r.data, `image/${r.format}`]);
  }
  for (const [key, data, contentType] of files) {
    if (storage) await storage.putObject(key, data, { contentType, cacheControl: IMMUTABLE });
    else {
      await mkdir(join('out', key, '..'), { recursive: true });
      await writeFile(join('out', key), data);
    }
  }
  images[lookId] = {
    width: rendered.master.width,
    height: rendered.master.height,
    blurhash: rendered.blurhash,
    widths,
  };
  console.error(`${lookId}: ${files.length} files ${storage ? 'uploaded' : 'written to ./out'}`);
}
console.log(JSON.stringify(images, null, 2));
