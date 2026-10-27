import { wardrobe } from '@robes/copy';
import { isDestination } from '@robes/core/add-flow';
import { BackLink } from '@/components/back-link';
import { ManualAdd } from '@/components/wardrobe/add/manual-add';

export default async function ManualAddPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const dest = isDestination(to) ? to : 'wardrobe';
  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/wardrobe/add?to=${dest}`} label={wardrobe.add.title} />
      <ManualAdd to={dest} />
    </div>
  );
}
