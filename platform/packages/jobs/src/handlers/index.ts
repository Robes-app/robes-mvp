import type { JobHandlers } from '../runtime';
import { createDailyHandler, type DailyDeps } from './daily';
import { createFakeHandler } from './fake';
import { createLookRenderHandler, type LookRenderDeps } from './look-render';
import { createStyleAnalyseHandler, type StyleAnalyseDeps } from './style-analyse';
import { createStylePieceHandler, type StylePieceDeps } from './style-piece';
import { createWardrobeAnalyseHandler, type WardrobeAnalyseDeps } from './wardrobe-analyse';

export interface HandlerDeps {
  fake?: { stepMs?: number };
  // Present when the runtime has AI + media wiring (workers, the dev inline transport).
  wardrobeAnalyse?: WardrobeAnalyseDeps;
  stylePiece?: StylePieceDeps;
  daily?: DailyDeps;
  styleAnalyse?: StyleAnalyseDeps;
  lookRender?: LookRenderDeps;
}

// One registry for SQS workers and the inline dev transport, keyed by job kind.
export function createHandlers(opts: HandlerDeps = {}): JobHandlers {
  return {
    fake: createFakeHandler(opts.fake),
    ...(opts.wardrobeAnalyse
      ? { wardrobe_analyse: createWardrobeAnalyseHandler(opts.wardrobeAnalyse) }
      : {}),
    ...(opts.stylePiece ? { key_piece: createStylePieceHandler(opts.stylePiece) } : {}),
    ...(opts.daily ? { daily: createDailyHandler(opts.daily) } : {}),
    ...(opts.lookRender ? { look_render: createLookRenderHandler(opts.lookRender) } : {}),
    ...(opts.styleAnalyse
      ? { stylenotes_analyse: createStyleAnalyseHandler(opts.styleAnalyse) }
      : {}),
  };
}
