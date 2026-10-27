import { Lookbook } from '@/components/looks/lookbook';

// No page title: the Saved | Suggested control IS the masthead (legacy header audit, 2026-10-07).
export default async function LooksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  return <Lookbook tab={tab === 'suggested' ? 'suggested' : 'saved'} />;
}
