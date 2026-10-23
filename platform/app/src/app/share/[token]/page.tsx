import { ApiError } from '@robes/api';
import { LegacyShareToken, ShareToken } from '@robes/contracts';
import { share as copy, marketing } from '@robes/copy';
import { buttonClasses, Eyebrow, Heading, Image, Text } from '@robes/ui';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { imageSources } from '@/lib/image';
import { clientIpFrom } from '@/server/client-ip';
import { type SharedLegacy, viewLegacyShare, viewShare } from '@/server/shares';

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

// A migrated legacy board (`/board/<id>` redirects here).
const loadLegacy = cache(async (token: string) =>
  LegacyShareToken.safeParse(token).success
    ? viewLegacyShare(token, clientIpFrom(await headers()))
    : null,
);

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const legacy = await loadLegacy(token);
  if (legacy) {
    return {
      title: `${legacy.name} · ${marketing.eyebrow}`,
      description: copy.metaDescription,
      robots: { index: false, follow: false },
      openGraph: { title: legacy.name },
    };
  }
  const look = await load(token);
  const image = look?.image ? imageSources(look.image.renditions)?.src : undefined;
  return {
    title: look ? `${look.name} · ${marketing.eyebrow}` : marketing.eyebrow,
    description: copy.metaDescription,
    // Personal content: shareable by link, never indexed.
    robots: { index: false, follow: false },
    ...(look ? { openGraph: { title: look.name, ...(image ? { images: [image] } : {}) } } : {}),
  };
}

function LegacyShare({ share }: { share: SharedLegacy }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Heading level={1} size="2xl">
          {share.name}
        </Heading>
      </header>
      {share.note ? <Text className="whitespace-pre-line">{share.note}</Text> : null}
      {share.ways.length > 0 ? (
        <section className="flex flex-col gap-4">
          <Heading level={2} size="lg">
            {copy.ways}
          </Heading>
          {share.ways.map((way, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: immutable snapshot order
            <div key={i} className="flex flex-col gap-1">
              <Heading level={3} size="md">
                {way.title}
              </Heading>
              {way.text ? <Text tone="muted">{way.text}</Text> : null}
            </div>
          ))}
        </section>
      ) : null}
      {share.pieces.length > 0 ? (
        <section className="flex flex-col gap-3">
          <Heading level={2} size="lg">
            {copy.pieces}
          </Heading>
          <ul className="flex flex-col gap-1">
            {share.pieces.map((piece, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: immutable snapshot order
              <li key={i}>
                <Text>{piece}</Text>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Link href="/" className={`${buttonClasses({ variant: 'primary' })} self-start`}>
        {copy.cta}
      </Link>
    </main>
  );
}

export default async function SharedLookPage({ params }: Props) {
  const { token } = await params;
  const legacy = await loadLegacy(token);
  if (legacy) return <LegacyShare share={legacy} />;
  const look = await load(token);
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
