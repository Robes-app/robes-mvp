import { useApi } from '@robes/api-client/react';
import type { Features } from '@robes/contracts';
import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';

const HIDDEN: Features = { trips: false };

// The flagged doors (GET /me/features); anything unanswered reads as off, so a door never flashes.
export function useFeatures(): { features: Features; ready: boolean } {
  const { data, isPending } = useApi('me.features');
  return { features: data ?? HIDDEN, ready: !isPending };
}

// A deep link or stale tap into a hidden feature lands on Today (legacy `__tvOpen` no-op, 2eacfb4).
export function FeatureGate({ flag, children }: { flag: keyof Features; children: ReactNode }) {
  const { features, ready } = useFeatures();
  if (!ready) return <LoadingScreen />;
  if (!features[flag]) return <Redirect href="/" />;
  return children;
}
