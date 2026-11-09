import { useLocalSearchParams, useRouter } from 'expo-router';
import { DraftLook } from '@/features/looks/DraftLook';

// The draft look as a form sheet over whatever started it (app/_layout.tsx DRAFT_SHEET; D14), and
// a saved look as the Edit look sheet from Home (D18).
export default function DraftRoute() {
  const router = useRouter();
  const { id, pieceId, day, images, pick } = useLocalSearchParams<{
    id: string;
    pieceId?: string;
    day?: string;
    // Home's image stack (3k): the sheet opens in image mode on Add a photo (D19).
    images?: string;
    // New Look › From pieces (Front Door PRD rev 3 §5.5): a new draft with the piece picker up.
    pick?: string;
  }>();
  return (
    <DraftLook
      id={id}
      {...(pieceId ? { pieceId } : {})}
      {...(day ? { day } : {})}
      {...(images === 'add' ? { images: 'add' as const } : {})}
      {...(pick === '1' ? { pick: true } : {})}
      presentation="sheet"
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/looks'))}
    />
  );
}
