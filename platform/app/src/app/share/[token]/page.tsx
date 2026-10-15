import { ApiError } from '@robes/api';
import { ShareToken } from '@robes/contracts';
import { share as copy, marketing } from '@robes/copy';
import { buttonClasses, Eyebrow, Heading, Image, Text } from '@robes/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { imageSources } from '@/lib/image';
import { viewShare } from '@/server/shares';

// One read (and one view count) per request, shared by metadata and the page.
const load = cache(async (token: string) => {
  if (!ShareToken.safeParse(token).success) return null;
  try {
    return await viewShare(token);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'not_found') return null;
    throw err;
  }
});

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const look = await load((await params).token);
  const image = look?.image ? imageSources(look.image.renditions)?.src : undefined;
  return {
    title: look ? `${look.name} · ${marketing.eyebrow}` : marketing.eyebrow,
    description: copy.metaDescription,
    // Personal content: shareable by link, never indexed.
    robots: { index: false, follow: false },
    ...(look ? { openGraph: { title: look.name, ...(image ? { images: [image] } : {}) } } : {}),
  };
}

export default async function SharedLookPage({ params }: Props) {
  const look = await load((await params).token);
  if (!look) notFound();
  const hero = look.image ? imageSources(look.image.renditions) : null;
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Heading level={1} size="2xl">
          {look.name}
        </Heading>
        {look.by ? <Text tone="muted">{copy.by(look.by)}</Text> : null}
      </header>
      {hero ? (
        <Image
          {...hero}
          sizes="(min-width: 672px) 640px, 100vw"
          alt={copy.imageAlt(look.name)}
          blurhash={look.image?.blurhash ?? null}
          priority
        />
      ) : null}
      {look.note ? <Text className="whitespace-pre-line">{look.note}</Text> : null}
      {look.pieces.length > 0 ? (
        <section className="flex flex-col gap-3">
          <Heading level={2} size="lg">
            {copy.pieces}
          </Heading>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {look.pieces.map((piece, i) => {
              const src = piece.image ? imageSources(piece.image.renditions) : null;
              return (
                // Snapshot pieces have no ids; their order is fixed at share time.
                // biome-ignore lint/suspicious/noArrayIndexKey: immutable snapshot order
                <li key={i} className="flex flex-col gap-1">
                  {src ? (
                    <Image
                      {...src}
                      sizes="(min-width: 640px) 200px, 50vw"
                      alt={copy.pieceAlt(piece.label)}
                      blurhash={piece.image?.blurhash ?? null}
                    />
                  ) : null}
                  <Text size="small">{piece.label}</Text>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <Link href="/" className={`${buttonClasses({ variant: 'primary' })} self-start`}>
        {copy.cta}
      </Link>
    </main>
  );
}
