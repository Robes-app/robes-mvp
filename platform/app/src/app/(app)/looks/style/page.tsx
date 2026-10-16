import { looks } from '@robes/copy';
import { PageHeader } from '@/components/page-header';
import { StyleForm } from './style-form';

export default function StylePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader eyebrow={looks.stylePiece.eyebrow} title={looks.stylePiece.title} />
      <StyleForm />
    </div>
  );
}
