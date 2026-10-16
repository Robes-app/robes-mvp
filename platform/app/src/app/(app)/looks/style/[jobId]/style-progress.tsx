'use client';

import { JobDeck } from '@/components/looks/deck';

// A styling job lands on the keep-or-pass deck (legacy 2026-10-07/09): dressing while the looks
// compose, then one card at a time.
export function StyleProgress({ jobId, home = false }: { jobId: string; home?: boolean }) {
  return <JobDeck jobId={jobId} home={home} />;
}
