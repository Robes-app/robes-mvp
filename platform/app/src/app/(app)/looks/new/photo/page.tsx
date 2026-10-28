import { LookFromPhoto } from '@/components/photo-pieces/look-from-photo';

// The read runs inside the draft, so this page carries only the way back (in the top bar): the draft's own
// masthead names it (legacy 2b — it was never a screen of its own).
export default function LookFromPhotoPage() {
  return (
    <div className="flex flex-col gap-4">
      <LookFromPhoto />
    </div>
  );
}
