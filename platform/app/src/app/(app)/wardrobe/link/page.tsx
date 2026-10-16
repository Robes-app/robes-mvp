import { wardrobe } from '@robes/copy';
import { PageHeader } from '@/components/page-header';
import { LinkImport } from '@/components/wardrobe/link-import';

export default function LinkImportPage() {
  return (
    <>
      <PageHeader eyebrow={wardrobe.link.eyebrow} title={wardrobe.link.title} />
      <LinkImport />
    </>
  );
}
