import type { Sources } from '@robes/core/looks';

// Style a piece → draft look (handoff 24 Nov): the piece's page starts the job, then opens the
// draft at /looks/draft/new?job=…&from=…, which follows it. Her words for the thread's first line
// and the sources she chose ride here, never in the address. Kept for the visit only: a hard load
// of that address still follows the job, with nothing to head its thread.
// The native twin is mobile/src/lib/piece-start.ts.
export interface PieceStart {
  jobId: string;
  words: string;
  sources: Sources;
}

let started: PieceStart | null = null;

export function handPieceStart(next: PieceStart): void {
  started = next;
}

// What the piece's page sent for this job; read, not taken, so a second render reads it too.
export function pieceStart(jobId: string): PieceStart | null {
  return started?.jobId === jobId ? started : null;
}
