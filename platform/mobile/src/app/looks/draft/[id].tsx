import { useLocalSearchParams, useRouter } from 'expo-router';
import { DraftLook } from '@/features/looks/DraftLook';

// The draft look as a form sheet over whatever started it (app/_layout.tsx DRAFT_SHEET; D14), and
// a saved look as the Edit look sheet from Home (D18).
export default function DraftRoute() {
  const router = useRouter();
  const { id, pieceId, day } = useLocalSearchParams<{
    id: string;
    pieceId?: string;
    day?: string;
  }>();
  return (
    <DraftLook
      id={id}
      {...(pieceId ? { pieceId } : {})}
      {...(day ? { day } : {})}
      presentation="sheet"
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/looks'))}
    />
  );
}
