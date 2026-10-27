import { notFound } from 'next/navigation';
import { Soon } from '@/components/soon';
import { SOON_SLUGS, SOON_TITLES, type SoonSlug } from '@/lib/nav';

function isSoonSlug(value: string): value is SoonSlug {
  return (SOON_SLUGS as readonly string[]).includes(value);
}

export default async function SoonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = isSoonSlug(slug) ? SOON_TITLES[slug] : undefined;
  if (!title) notFound();
  return <Soon title={title} />;
}
