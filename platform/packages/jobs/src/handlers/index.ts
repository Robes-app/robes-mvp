import type { JobHandlers } from '../runtime';
import { createFakeHandler } from './fake';
import { createStyleAnalyseHandler, type StyleAnalyseDeps } from './style-analyse';
import { createStylePieceHandler, type StylePieceDeps } from './style-piece';
import { createWardrobeAnalyseHandler, type WardrobeAnalyseDeps } from './wardrobe-analyse';

export interface HandlerDeps {
  fake?: { stepMs?: number };
  // Present when the runtime has AI + media wiring (workers, the dev inline transport).
  wardrobeAnalyse?: WardrobeAnalyseDeps;
  stylePiece?: StylePieceDeps;
  styleAnalyse?: StyleAnalyseDeps;
}

// One registry for SQS workers and the inline dev transport, keyed by job kind.
export function createHandlers(opts: HandlerDeps = {}): JobHandlers {
  return {
    fake: createFakeHandler(opts.fake),
    ...(opts.wardrobeAnalyse
      ? { wardrobe_analyse: createWardrobeAnalyseHandler(opts.wardrobeAnalyse) }
      : {}),
    ...(opts.stylePiece ? { key_piece: createStylePieceHandler(opts.stylePiece) } : {}),
    ...(opts.styleAnalyse
      ? { stylenotes_analyse: createStyleAnalyseHandler(opts.styleAnalyse) }
      : {}),
  };
}
