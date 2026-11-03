import { isDestination } from '@robes/core/add-flow';
import { LinkImport } from '@/components/wardrobe/link-import';

export default async function LinkImportPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const initial = isDestination(to) ? to : 'wardrobe';
  return (
    <div className="flex flex-col gap-4">
      <LinkImport initial={initial} />
    </div>
  );
}
