import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StackScreen } from '@/components/StackScreen';
import { destinationOf, parseShots } from '@/features/wardrobe/add/flow';
import { Review } from '@/features/wardrobe/add/Review';

// Review: where every way in lands (design "Add Piece — Handoff").
export default function ReviewRoute() {
  const params = useLocalSearchParams<{
    to?: string;
    from?: string;
    shots?: string;
    link?: string;
  }>();
  // Read once: the session owns its photos from here.
  const [shots] = useState(() => parseShots(params.shots));
  const from = params.from === 'camera' || params.from === 'roll' ? params.from : null;
  return (
    // No header title: Review's own serif title says where she is (one header, as beta's × row).
    <StackScreen close>
      <Review
        to={destinationOf(params.to)}
        from={from}
        shots={shots}
        link={typeof params.link === 'string' ? params.link : null}
      />
    </StackScreen>
  );
}
