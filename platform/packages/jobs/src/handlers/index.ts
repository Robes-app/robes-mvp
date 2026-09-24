import type { JobHandlers } from '../runtime';
import { createDailyHandler, type DailyDeps } from './daily';
import { createFakeHandler } from './fake';
import { createLinkImportHandler, type LinkImportDeps } from './link-import';
import { createLookRenderHandler, type LookRenderDeps } from './look-render';
import { createStyleAnalyseHandler, type StyleAnalyseDeps } from './style-analyse';
import { createStylePieceHandler, type StylePieceDeps } from './style-piece';
import { createTravelHandler, type TravelDeps } from './travel';
import { createWardrobeAnalyseHandler, type WardrobeAnalyseDeps } from './wardrobe-analyse';

export interface HandlerDeps {
  linkImport?: LinkImportDeps;
  fake?: { stepMs?: number };
  // Present when the runtime has AI + media wiring (workers, the dev inline transport).
  wardrobeAnalyse?: WardrobeAnalyseDeps;
  stylePiece?: StylePieceDeps;
  daily?: DailyDeps;
  styleAnalyse?: StyleAnalyseDeps;
  lookRender?: LookRenderDeps;
  travel?: TravelDeps;
}

// One registry for SQS workers and the inline dev transport, keyed by job kind.
export function createHandlers(opts: HandlerDeps = {}): JobHandlers {
  return {
    fake: createFakeHandler(opts.fake),
    ...(opts.linkImport ? { link_import: createLinkImportHandler(opts.linkImport) } : {}),
    ...(opts.wardrobeAnalyse
      ? { wardrobe_analyse: createWardrobeAnalyseHandler(opts.wardrobeAnalyse) }
      : {}),
    ...(opts.stylePiece ? { key_piece: createStylePieceHandler(opts.stylePiece) } : {}),
    ...(opts.daily ? { daily: createDailyHandler(opts.daily) } : {}),
    ...(opts.lookRender ? { look_render: createLookRenderHandler(opts.lookRender) } : {}),
    ...(opts.travel ? { travel: createTravelHandler(opts.travel) } : {}),
    ...(opts.styleAnalyse
      ? { stylenotes_analyse: createStyleAnalyseHandler(opts.styleAnalyse) }
      : {}),
  };
}
