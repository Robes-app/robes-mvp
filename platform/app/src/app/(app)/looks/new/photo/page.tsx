import { looks } from '@robes/copy';
import { BackLink } from '@/components/back-link';
import { LookFromPhoto } from '@/components/photo-pieces/look-from-photo';

// The read runs inside the draft, so this page carries only the way back: the draft's own
// masthead names it (legacy 2b — it was never a screen of its own).
export default function LookFromPhotoPage() {
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/looks" label={looks.title} />
      <LookFromPhoto />
    </div>
  );
}
