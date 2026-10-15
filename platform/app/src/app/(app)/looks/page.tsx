import { looks } from '@robes/copy';
import { Lookbook } from '@/components/looks/lookbook';
import { PageHeader } from '@/components/page-header';

export default async function LooksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  return (
    <>
      <PageHeader title={looks.title} />
      <Lookbook tab={tab === 'suggested' ? 'suggested' : 'saved'} />
    </>
  );
}
