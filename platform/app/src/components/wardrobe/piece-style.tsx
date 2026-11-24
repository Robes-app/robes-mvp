'use client';

import { useApiClient } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import {
  anchorName,
  type Source,
  type Sources,
  sourceBalance,
  toggleSource,
} from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { Image, useToast } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { PromptDock, PromptSheetFixed, StylingCard } from '@/components/looks/styling-card';
import { errorCopy } from '@/lib/error-copy';
import { pieceSources } from '@/lib/image';
import { handPieceStart } from '@/lib/piece-start';

const copy = wardrobe.piece;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
// Both sources on: a piece she owns is styled from her wardrobe and the shop alike (handoff §4.2).
const BOTH: Sources = { wardrobe: true, shop: true };
const noop = () => undefined;

// Style a piece → draft look (handoff 24 Nov, design 3b): the sparkle on her piece's page opens the
// draft look's own bar, the piece as a chip over the sources and her words. A send — her words, or
// none, when the piece is the request — starts one draft styled around the piece, its anchor, and
// opens the draft look following it. The bar's × or the scrim closes it, and nothing is made.
// `hidden`: another sheet of the page is open. Native twin: features/wardrobe/PieceStyle.tsx.
export function PieceStyle({ piece, hidden }: { piece: Piece; hidden: boolean }) {
  const api = useApiClient();
  const router = useRouter();
  const toast = useToast();
  const { track } = useAnalytics().analytics;
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [sources, setSources] = useState<Sources>(BOTH);
  const [busy, setBusy] = useState(false);
  const close = () => {
    if (busy) return;
    setOpen(false);
  };
  const send = async () => {
    if (busy) return;
    const words = prompt.trim() || copy.style.prompt(anchorName(piece.label, piece.brand));
    setBusy(true);
    const tracked = (ok: boolean) =>
      track('prompt_submitted', { surface: 'piece', intent: 'piece', scope: 'none', ok });
    try {
      const { jobId } = await api.call('looks.prompt', {
        input: {
          prompt: words,
          draft: true,
          anchorPieceId: piece.id,
          balance: sourceBalance(sources),
        },
      });
      tracked(true);
      handPieceStart({ jobId, words, sources });
      setOpen(false);
      setPrompt('');
      router.push(`/looks/draft/new?job=${jobId}&from=${piece.id}`);
    } catch (err) {
      tracked(false);
      toast({ message: errorCopy(err) });
    } finally {
      setBusy(false);
    }
  };
  if (open) {
    return (
      <PromptSheetFixed onScrim={close}>
        <PromptDock
          state="bar"
          first
          line={null}
          working={busy}
          dot={false}
          expandable={false}
          onRestore={noop}
          onExpand={noop}
          onCollapse={noop}
        >
          <StylingCard
            lead={<PieceChip piece={piece} onClose={close} />}
            sources={sources}
            onSource={(which: Source) => setSources(toggleSource(sources, which, 1))}
            wardrobeEmpty={false}
            placeholder={copy.style.placeholder}
            value={prompt}
            onChange={setPrompt}
            onSend={() => void send()}
            emptySend="send"
            busy={busy}
          />
        </PromptDock>
      </PromptSheetFixed>
    );
  }
  if (hidden) return null;
  return (
    <button
      type="button"
      aria-label={copy.stylePiece}
      title={copy.stylePiece}
      onClick={() => {
        track('piece_style_opened');
        setOpen(true);
      }}
      data-testid="piece-style"
      className={`fixed right-[18px] bottom-[calc(22px+env(safe-area-inset-bottom))] z-30 flex size-[54px] items-center justify-center rounded-pill bg-ink text-bg shadow-float ${focus}`}
    >
      <Icon name="looks" size={19} />
    </button>
  );
}

// The piece the box is about (handoff §4.2): its picture, its name in the serif, "{Category} ·
// {Brand}", and × to close the box. Native twin: PieceChip in features/wardrobe/PieceStyle.tsx.
function PieceChip({ piece, onClose }: { piece: Piece; onClose: () => void }) {
  const photo = pieceSources(piece.image);
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] bg-surface p-1.5"
      data-testid="piece-chip"
    >
      <div className="w-10 shrink-0 overflow-hidden rounded-[7px]">
        {photo ? (
          <Image sizes="40px" alt="" aspect="4:5" {...photo} />
        ) : (
          <div className="aspect-[4/5] bg-surface-sunk" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base text-ink">{piece.label}</p>
        <p className="truncate font-sans text-[11.5px] text-ink-muted">
          {copy.style.sub(piece.category, piece.brand)}
        </p>
      </div>
      <button
        type="button"
        aria-label={copy.style.close}
        title={copy.style.close}
        onClick={onClose}
        data-testid="piece-chip-close"
        className={`relative mr-1.5 flex size-[30px] shrink-0 items-center justify-center rounded-pill border border-rule-mid bg-surface-raised text-ink-muted after:absolute after:-inset-2 after:content-[''] hover:text-ink ${focus}`}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
