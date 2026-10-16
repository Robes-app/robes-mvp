import { admin as copy } from '@robes/copy';
import { Text } from '@robes/ui';
import { PageHeader } from '@/components/page-header';
import { flags } from '@/server/admin';
import { requireAdmin } from '@/server/session';
import { FlagList } from './flag-list';

export default async function AdminFlags() {
  const { items } = await flags(await requireAdmin());
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.flags.title} />
      <Text tone="muted">{copy.flags.hint}</Text>
      <FlagList initial={items} />
    </>
  );
}
