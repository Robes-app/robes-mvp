import { useLocalSearchParams, useRouter } from 'expo-router';
import { DraftLook } from '@/features/looks/DraftLook';

// The draft look as a form sheet over whatever started it (app/_layout.tsx DRAFT_SHEET; D14).
export default function DraftRoute() {
  const router = useRouter();
  const { id, pieceId, day, sheet } = useLocalSearchParams<{
    id: string;
    pieceId?: string;
    day?: string;
    sheet?: string;
  }>();
  return (
    <DraftLook
      id={id}
      {...(pieceId ? { pieceId } : {})}
      {...(day ? { day } : {})}
      {...(sheet === 'adjust' || sheet === 'describe' ? { sheet } : {})}
      presentation="sheet"
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/looks'))}
    />
  );
}
