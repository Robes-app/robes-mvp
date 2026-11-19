'use client';

import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import {
  type CreateLookInput,
  type Look,
  type LookAskInput,
  lookStack,
  type Model,
  type Piece,
  type Wish,
  wishRow,
} from '@robes/contracts';
import { lookbook, looks as looksCopy } from '@robes/copy';
import { readsAsThey } from '@robes/core/avatar';
import { isTerminalJobStatus } from '@robes/core/jobs';
import {
  type Balance,
  type DockMove,
  type DockState,
  defaultSources,
  dockDot,
  dockNext,
  dockStart,
  type ImageStage,
  isCaptureRow,
  nameNoBrand,
  pictureLanding,
  type RackRow,
  rackLayoutFor,
  type Source,
  type Sources,
  type StageCard,
  sourceBalance,
  stageCards,
  stageChanged,
  stageFront,
  stageInFront,
  toggleSource,
} from '@robes/core/looks';
import type { WardrobeLayout } from '@robes/core/wardrobe';
import { shortRange } from '@robes/core/weather';
import { Icon } from '@robes/icons/web';
import {
  AlertDialog,
  Button,
  Drawer,
  type DrawerDone,
  DrawerHeader,
  ErrorText,
  Image,
  Skeleton,
  Tabs,
  useKeyboardInset,
  useToast,
  useToastLiftOver,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { useHideBack, usePushedView } from '@/components/shell/app-shell';
import { AddPiecesSheet } from '@/components/wardrobe/add/add-pieces-sheet';
import { LayoutToggle } from '@/components/wardrobe/wardrobe-header';
import { type Adjust, useAdjust } from '@/lib/adjust';
import { useCaptureRack } from '@/lib/capture-rack';
import { dayReturn } from '@/lib/day-origin';
import { errorCopy } from '@/lib/error-copy';
import { usePhotoFiling } from '@/lib/file-photo';
import { onRackIds, useLookEditor } from '@/lib/look-editor';
import { useImageStage } from '@/lib/look-images';
import { isDraftsFull, useLetGo, useRefreshLooks, useSaveLook } from '@/lib/look-states';
import { useJob } from '@/lib/use-job';
import { useWishOf } from '@/lib/wish-of';
import { Answers, Feedback, FeedbackTokens, ThreadLines, Thumbs } from './adjust-dock';
import { CapturePieces, CaptureRow, NewPieceSheet, RemovedLine } from './capture-rack';
import { DayContext, DayMeta } from './day-context';
import { DiarySheet } from './diary-sheet';
import { CardPicture, ImageManager } from './image-manager';
import { LookDetails } from './look-details';
import { LookImage } from './look-image';
import { LookPicture } from './look-page';
import { PieceList } from './piece-list';
import { type PickerMode, PiecePicker } from './piece-picker';
import { RackCard } from './rack-card';
import { RackGrid } from './rack-grid';
import { RackRowCard } from './rack-row';
import { ImageStack, useDressOnOpen } from './saved-look';
import { Scanning } from './scan-line';
import { SeasonsView } from './seasons-view';
import { PromptDock, StylingCard } from './styling-card';
import { TagsView } from './tags-view';
import { WornView } from './worn-view';

const copy = lookbook.draftLook;
const d = lookbook.draft;
// Picks made together dress the model once: the wait after the last before it is drawn.
const DRESS_SETTLE_MS = 800;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const TABS = [lookbook.savedLook.tabs.pieces, lookbook.savedLook.tabs.details] as const;
// How long "Look updated" stands (Capture PRD 3.5).
const UPDATED_MS = 2600;
type Tab = (typeof TABS)[number];

// `drawer` over the screen that opened it; `page` on a deep link; `saved` is a saved look's own
// page (Felix 3e: the back disc on the photo, Schedule look at the foot — Update look in its place
// while a change waits, PRD §6.1; D17).
export type DraftPresentation = 'drawer' | 'page' | 'saved';

const pronoun = (m: Model | undefined) =>
  m?.presence === 'man' ? 'him' : readsAsThey(m?.presence) ? 'them' : 'her';

// The dressing lines (design 3b), one at a time while the picture is drawn.
export function useDressingLine(lines: readonly string[], on: boolean): string {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setI((n) => n + 1), 2200);
    return () => clearInterval(t);
  }, [on]);
  return lines[i % lines.length] ?? '';
}

// The prompt's two sources (look prompt PRD S1–S6): her wardrobe alone once she has one, Shop
// alone while it is empty, until she says otherwise. The choice lasts for this look's thread and
// is never stored. `owned` is null while the wardrobe's count loads.
function useSources(
  owned: number | null,
  initial: Sources | null = null,
): {
  sources: Sources;
  // She owns nothing: Wardrobe is faded, and a tap on it opens "Your wardrobe is empty" (S3).
  empty: boolean;
  toggle: (which: Source) => void;
  balance: Balance;
  // Changed since the look was last applied (a saved look's Update, PRD §6.1).
  changed: boolean;
  settle: () => void;
} {
  // `initial`: what she had chosen in the box her brief was sent from; the draft keeps it.
  const [chosen, setChosen] = useState<Sources | null>(initial);
  const [applied, setApplied] = useState<Balance | null>(null);
  const count = owned ?? 1;
  const rest = defaultSources(count);
  const sources = chosen ?? rest;
  const balance = sourceBalance(sources);
  return {
    sources,
    empty: owned === 0,
    toggle: (which) => setChosen(toggleSource(sources, which, count)),
    balance,
    changed: chosen !== null && balance !== (applied ?? sourceBalance(rest)),
    settle: () => setApplied(balance),
  };
}

// A tap on Wardrobe while she owns nothing (S3, docked prompt PRD W2): a centred alert, never a
// switch; Add pieces opens the Add Pieces sheet over the draft. Native twin: DraftLook.tsx
// EmptyWardrobeAlert.
function EmptyWardrobeAlert({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      title={copy.emptyWardrobe.title}
      message={copy.emptyWardrobe.body}
      actions={[
        {
          label: copy.emptyWardrobe.add,
          variant: 'primary',
          onClick: () => {
            onClose();
            onAdd();
          },
        },
        { label: copy.emptyWardrobe.notNow, variant: 'outline', onClick: onClose },
      ]}
      onDismiss={onClose}
    />
  );
}

// The day's weather for the look prompt, while its chip stands (D22; the ask's context).
function useAskContext(date: string | null, weatherOff: boolean): LookAskInput['context'] {
  const today = useApi('today.get', undefined, { enabled: date !== null });
  if (!date || weatherOff) return undefined;
  const day = today.data?.diary?.days.find((x) => x.date === date);
  const wx = day?.weather;
  if (!wx) return undefined;
  const city = day.place?.city ?? wx.city ?? '';
  return { weather: `${shortRange(wx.tempRange)}${city ? ` in ${city}` : ''}`.slice(0, 60) };
}

// The Rack's controls, at the end of the Pieces · Details line (Annie, 16 Nov): the grid | list
// toggle and the pencil that turns on Edit pieces (PRD §6.2, plan R2), ink-filled while it is on.
// Native twin: DraftLook.tsx RackControls.
function RackControls({
  layout,
  onLayout,
  editing,
  onEditing,
}: {
  layout: WardrobeLayout;
  onLayout: (next: WardrobeLayout) => void;
  editing: boolean;
  onEditing: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <LayoutToggle layout={layout} onLayout={onLayout} />
      <button
        type="button"
        aria-label={copy.editPieces}
        title={copy.editPieces}
        aria-pressed={editing}
        onClick={() => onEditing(!editing)}
        data-testid="rack-pencil"
        className={`relative flex size-8 shrink-0 items-center justify-center rounded-pill border after:absolute after:-inset-1.5 after:content-[''] ${
          editing
            ? 'border-ink bg-ink text-bg'
            : 'border-rule-mid bg-surface-raised text-ink hover:border-border-control'
        } ${focus}`}
      >
        <Icon name="pencil" size={14} />
      </button>
    </div>
  );
}

// The Rack (PRD §4.6): the rows or the tiles, and the add slot under them; its controls sit on the
// Pieces · Details line. Before the first piece the Rack card stands alone.
function Rack({
  rows,
  imageOf,
  layout,
  editing,
  hasWardrobe,
  onAdd,
  hrefOf,
  onSwap,
  onRemove,
  children,
}: {
  rows: readonly RackRow[];
  imageOf: Parameters<typeof RackGrid>[0]['imageOf'];
  layout: WardrobeLayout;
  // Edit-pieces mode (PRD §6.2, plan R2): the rows' swap and × out.
  editing: boolean;
  hasWardrobe: boolean;
  onAdd: () => void;
  // Where a tile opens at rest (a piece's page, a wish's).
  hrefOf?: (row: RackRow) => string | undefined;
  // Edit mode on the grid side: each tile's swap and ×.
  onSwap?: (row: RackRow) => void;
  onRemove?: (row: RackRow) => void;
  // The rows, as RackRowCards.
  children: ReactNode;
}) {
  if (rows.length === 0) return <RackCard hasWardrobe={hasWardrobe} onClick={onAdd} />;
  return (
    <div className="flex flex-col gap-2.5" data-testid="the-rack">
      {/* Once a piece hangs, the add slot is the small + hanger chip under the rows, on a draft as
          on a saved look; the big card is only for an empty rack (Annie, 15 Nov). */}
      {layout === 'grid' ? (
        <>
          <RackGrid
            rows={rows}
            imageOf={imageOf}
            {...(hrefOf ? { hrefOf } : {})}
            {...(editing && onSwap && onRemove ? { editing: { onSwap, onRemove } } : {})}
          />
          <PieceList onAdd={onAdd}>{null}</PieceList>
        </>
      ) : (
        <PieceList label={lookbook.rack.title(rows.length)} onAdd={onAdd}>
          {children}
        </PieceList>
      )}
    </div>
  );
}

// The draft look (Felix DraftLook; plan 2026-11-06 D14, D17, D18): ONE component for every draft
// — from Describe, built by hand, started from a piece — and for a saved look, which edits in
// place on its own page (3e) and in the Edit look drawer from Home (3k). The header carries × and the ink done disc; under the photo (the image
// stack) sit Pieces · Details, the piece list with its add slot, and the docked prompt, whose
// sends feed the one thread (`useAdjust`) and draw the picture once it lands; a look Robes made is restyled whole from the thread's
// Restyle it all. `id` is a look,
// or 'new' before the first piece. The native twin is mobile/src/features/looks/DraftLook.tsx.
// Her words, when Robes made the draft from them just now: what heads its thread, and what she
// chose in the box they went from. Native twin: DraftLook.tsx.
type DraftBrief = { words: string; occasion?: string; sources?: Sources; weatherOff?: boolean };

export function DraftLook({
  id,
  pieceId,
  day,
  images,
  pick = false,
  schedule,
  presentation,
  onClose,
}: {
  id: string;
  pieceId?: string;
  // The day the draft is for (home's door): Save pins it there; Discard goes back to that day.
  day?: string;
  // Opened from Home's image stack (3k): image mode, Add a photo in focus (D19).
  images?: 'add';
  // New Look › From pieces (Front Door PRD rev 3 §5.5): a new draft with the piece picker up.
  pick?: boolean;
  // A saved look opened with the diary up (a draft just saved, `?schedule=1`).
  schedule?: boolean;
  presentation: DraftPresentation;
  onClose: () => void;
}) {
  const [lookId, setLookId] = useState<string | null>(id === 'new' ? null : id);
  // Her words, when Robes made this draft from them just now: they head its thread.
  const [brief, setBrief] = useState<DraftBrief | null>(null);
  const query = useApi(
    'looks.get',
    { params: { id: lookId ?? '' } },
    {
      enabled: lookId !== null,
      // Until the picture has landed, renditions and all (pictureLanding).
      refetchInterval: (q) => (pictureLanding(q.state.data) ? 3_000 : false),
    },
  );
  if (lookId === null) {
    return (
      <NewDraft
        {...(pieceId ? { pieceId } : {})}
        {...(day ? { day } : {})}
        pick={pick}
        presentation={presentation}
        onClose={onClose}
        onCreated={(made, from) => {
          if (from) setBrief(from);
          setLookId(made.id);
          // The draft carries on under its own address, without leaving the drawer.
          if (typeof window !== 'undefined') {
            const search = day ? `?day=${day}` : '';
            window.history.replaceState(null, '', `/looks/draft/${made.id}${search}`);
          }
        }}
      />
    );
  }
  if (query.isError) {
    return (
      <Shell presentation={presentation} title={copy.title} onClose={onClose} done={null}>
        <div className="px-5 pt-5">
          <ErrorText>{errorCopy(query.error)}</ErrorText>
        </div>
      </Shell>
    );
  }
  if (!query.data) {
    return (
      <Shell presentation={presentation} title={copy.title} onClose={onClose} done={null}>
        <Skeleton className="aspect-[4/5] w-full" />
      </Shell>
    );
  }
  return (
    <DraftBody
      look={query.data}
      forDay={query.data.setId ? query.data.dateHint : (day ?? null)}
      schedule={schedule === true}
      {...(images ? { images } : {})}
      {...(brief ? { brief } : {})}
      presentation={presentation}
      onClose={onClose}
    />
  );
}

// The drawer, or the same anatomy on a page (a deep link, with no screen beneath).
// The prompt at the look's foot (redline 14 Nov): what floats there, and — a saved look's prompt
// opened — the scrim that greys the look behind it and closes it on a tap.
interface ShellDock {
  node: ReactNode;
  // The prompt is open as its sheet: it stands at the foot over the dimmed look, and a tap on
  // the look behind it closes it (testing, 15 Nov: in a draft as on a saved look).
  onScrim?: () => void;
  // A new look opens scrolled to its foot, so the Rack's card stands clear above the prompt box
  // and never under it.
  startAtEnd?: boolean;
  // The sparkle stands beside the saved look's one button, in its row (design 2c), rather than
  // floating above it.
  beside?: boolean;
}

// The open prompt inside a frame that already rides the keyboard (the drawer's body): a scrim
// over the look and the sheet on the frame's foot.
function PromptSheetLayer({ dock }: { dock: ShellDock }) {
  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={dock.onScrim}
        data-testid="prompt-scrim"
        className="absolute inset-0 z-10 cursor-default bg-backdrop motion-safe:animate-[robes-fade-in_250ms_ease]"
      />
      <div className="absolute inset-x-0 bottom-0 z-20 motion-safe:animate-[robes-sheet-up_300ms_cubic-bezier(.2,0,.2,1)]">
        {dock.node}
      </div>
    </>
  );
}

// The same on a page, where nothing else lifts it: fixed to the screen's foot, on the keyboard.
function PromptSheetFixed({ dock }: { dock: ShellDock }) {
  const keyboard = useKeyboardInset();
  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={dock.onScrim}
        data-testid="prompt-scrim"
        className="fixed inset-0 z-40 cursor-default bg-backdrop motion-safe:animate-[robes-fade-in_250ms_ease]"
      />
      <div
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md motion-safe:animate-[robes-sheet-up_300ms_cubic-bezier(.2,0,.2,1)]"
        style={keyboard ? { bottom: keyboard } : undefined}
      >
        {dock.node}
      </div>
    </>
  );
}

// The prompt floats at the foot of whatever scrolls: it sticks to the bottom of the drawer's body
// (which the drawer already stands on the keyboard) or of the page, with no band or rule of its
// own, and the look scrolls under it. Only what is drawn takes a tap.
function FloatingDock({
  children,
  lift = 0,
  startAtEnd = false,
}: {
  children: ReactNode;
  lift?: number;
  startAtEnd?: boolean;
}) {
  const foot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (startAtEnd) foot.current?.scrollIntoView({ block: 'end' });
  }, [startAtEnd]);
  return (
    <div
      ref={foot}
      className="pointer-events-none sticky bottom-0 z-10 mt-auto pt-2 *:pointer-events-auto"
      style={lift ? { bottom: lift } : undefined}
      data-testid="floating-dock"
    >
      {children}
    </div>
  );
}

function Shell({
  presentation,
  title,
  h1,
  onClose,
  done,
  over,
  footer,
  dock,
  children,
}: {
  presentation: DraftPresentation;
  title: string;
  h1?: string;
  onClose: () => void;
  done: DrawerDone | null;
  over?: ReactNode;
  footer?: ReactNode;
  dock?: ShellDock | null;
  children: ReactNode;
}) {
  if (presentation === 'saved') {
    return (
      <SavedShell h1={h1} over={over} footer={footer} dock={dock ?? null}>
        {children}
      </SavedShell>
    );
  }
  if (presentation === 'drawer') {
    return (
      <Drawer
        open
        title={title}
        onClose={onClose}
        closeLabel={copy.close}
        done={done}
        over={
          <>
            {over}
            {dock?.onScrim ? <PromptSheetLayer dock={dock} /> : null}
          </>
        }
        {...(footer ? { footer } : {})}
        testId="draft-look"
      >
        {/* A column as tall as the drawer's body, so the prompt rests at its foot under a short
            look and sticks there over a long one. */}
        <div className={dock ? '-mb-8 flex min-h-full flex-col' : undefined}>
          {h1 ? <h1 className="sr-only">{h1}</h1> : null}
          {children}
          {dock && !dock.onScrim ? (
            <FloatingDock startAtEnd={dock.startAtEnd === true}>{dock.node}</FloatingDock>
          ) : null}
        </div>
      </Drawer>
    );
  }
  return (
    <PageShell title={title} h1={h1} onClose={onClose} done={done} over={over} dock={dock ?? null}>
      {children}
      {footer ? <div className="px-5 pt-5">{footer}</div> : null}
    </PageShell>
  );
}

// A saved look's own page (3e): no header, the back disc rides the photo; the body runs to the
// look's one bar, held at the foot (Schedule look, or Update look while a hand edit waits) above
// the tab bar on a phone. The prompt floats over it: closed, the sparkle or its bar just above
// the look's bar; opened, a sheet from the foot over a scrim, standing on the keyboard, and the
// look's bar steps away (redline 14 Nov, pins 23 and 25).
function SavedShell({
  h1,
  over,
  footer,
  dock,
  children,
}: {
  h1?: string;
  over?: ReactNode;
  footer?: ReactNode;
  dock: ShellDock | null;
  children: ReactNode;
}) {
  // The page's back pill stands down: the disc on the photo is the way back.
  useHideBack(true);
  const sheet = dock?.onScrim;
  return (
    <article
      className="relative -mx-4 flex flex-col pb-40 md:mx-auto md:w-full md:max-w-md"
      data-testid="saved-look"
    >
      {h1 ? <h1 className="sr-only">{h1}</h1> : null}
      {children}
      {footer && !sheet ? (
        <LookBar {...(dock?.beside ? { beside: dock.node } : { float: dock?.node })}>
          {footer}
        </LookBar>
      ) : dock && !sheet ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md pb-[env(safe-area-inset-bottom)] *:pointer-events-auto">
          {dock.node}
        </div>
      ) : null}
      {dock && sheet ? <PromptSheetFixed dock={dock} /> : null}
      {/* The floating sheets ride the screen, not the page: 8px above everything, the look's bar
          included (redline 7 Nov). The layer lets taps through except where a sheet is. */}
      {over ? (
        <div className="pointer-events-none fixed inset-0 z-40 mx-auto max-w-md *:pointer-events-auto">
          {over}
        </div>
      ) : null}
    </article>
  );
}

// The saved look's foot, sticky on its band at the screen's foot: its one button, and the sparkle
// beside it (`beside`, design 2c); toasts rise above it, so an Undo never covers either.
// `float` is the prompt's bar, riding just above it with nothing behind it.
function LookBar({
  children,
  float,
  beside,
}: {
  children: ReactNode;
  float?: ReactNode;
  beside?: ReactNode;
}) {
  const bar = useRef<HTMLDivElement>(null);
  useToastLiftOver(bar);
  return (
    <div
      ref={bar}
      className="fixed inset-x-0 bottom-0 z-30 border-hairline border-t-[0.5px] bg-bg pb-[max(1.375rem,env(safe-area-inset-bottom))]"
      data-testid="look-bar"
    >
      {float ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-full mx-auto max-w-md *:pointer-events-auto">
          {float}
        </div>
      ) : null}
      {/* Its one button takes the row, label centred, the sparkle beside it (Annie, 18 Nov). */}
      <div className="mx-auto flex w-full max-w-md items-center gap-3 px-5 pt-3">
        <div className="flex min-w-0 flex-1 flex-col *:w-full">{children}</div>
        {beside}
      </div>
    </div>
  );
}

function PageShell({
  title,
  h1,
  onClose,
  done,
  over,
  dock,
  children,
}: {
  title: string;
  h1?: string;
  onClose: () => void;
  done: DrawerDone | null;
  over?: ReactNode;
  dock: ShellDock | null;
  children: ReactNode;
}) {
  // A pushed view on a phone: the back pill alone, no masthead and no dock.
  usePushedView();
  const keyboard = useKeyboardInset();
  return (
    <article
      className="relative mx-auto flex w-full max-w-md flex-col overflow-clip rounded-t-sheet border-[0.5px] border-rule-mid bg-bg md:rounded-sheet"
      data-testid="draft-look"
    >
      {h1 ? <h1 className="sr-only">{h1}</h1> : null}
      <DrawerHeader title={title} onClose={onClose} closeLabel={copy.close} done={done} />
      <div className="relative">
        <div className={dock ? 'flex flex-col' : 'pb-8'}>
          {children}
          {dock && !dock.onScrim ? (
            <FloatingDock lift={keyboard} startAtEnd={dock.startAtEnd === true}>
              {dock.node}
            </FloatingDock>
          ) : null}
        </div>
        {over}
        {dock?.onScrim ? <PromptSheetFixed dock={dock} /> : null}
      </div>
    </article>
  );
}

// Before the first piece (/looks/draft/new): her model in its base layer, the add slot and the
// prompt card. The first pieces make the draft, which carries on in the same drawer; words alone
// go to Robes as a brief (the Lookbook's "Where to?", a set of suggestions).
function NewDraft({
  pieceId,
  day,
  pick = false,
  presentation,
  onClose,
  onCreated,
}: {
  pieceId?: string;
  // Describe on Home (D22): the day the draft is for; Generate makes that day's one draft.
  day?: string;
  // From pieces: the picker is already up when the drawer opens.
  pick?: boolean;
  presentation: DraftPresentation;
  onClose: () => void;
  // `from`: her brief, and the occasion Robes read in it, when Robes made the draft from it.
  onCreated: (look: Look, from?: DraftBrief) => void;
}) {
  const api = useApiClient();
  const toast = useToast();
  const refresh = useRefreshLooks();
  const model = useApi('me.model.get');
  const summary = useApi('wardrobe.summary');
  const owned = summary.data?.total ?? null;
  const hasWardrobe = owned !== null && owned > 0;
  const src = useSources(owned);
  const { track } = useAnalytics().analytics;
  const [emptyWardrobe, setEmptyWardrobe] = useState(false);
  const [picker, setPicker] = useState<PickerMode | null>(pick ? { add: true } : null);
  const [adding, setAdding] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState<{ input: CreateLookInput; oldest: string } | null>(null);
  const photo = usePhotoFiling();

  const create = async (input: CreateLookInput) => {
    setBusy(true);
    try {
      const made = await api.call('looks.create', { input });
      refresh(made);
      onCreated(made);
    } catch (err) {
      setBusy(false);
      if (!isDraftsFull(err)) {
        toast({ message: errorCopy(err) });
        return;
      }
      const drafts = await api
        .call('looks.list', { input: { limit: 60, status: 'draft' } })
        .catch(() => null);
      setFull({ input, oldest: drafts?.items.at(-1)?.name ?? lookbook.draftTile.untitled });
    }
  };
  // The first pieces make the draft; a wish from the picker rides as a proposal already hers.
  const start = (pieces: Piece[], wishes: Wish[] = []) =>
    void create({
      status: 'draft',
      pieces: pieces.map((p) => ({ pieceId: p.id })),
      ...(wishes.length
        ? { proposals: wishes.flatMap((w) => (wishRow(w).proposal ? [wishRow(w).proposal] : [])) }
        : {}),
    } as CreateLookInput);
  // "Start a look with it" from a piece: the draft opens with that piece on the rack.
  const started = useRef(false);
  useEffect(() => {
    if (pieceId && !started.current) {
      started.current = true;
      void create({ status: 'draft', pieces: [{ pieceId }], anchorPieceId: pieceId });
    }
  });
  const filed = photo.filing.phase === 'filed' ? photo.filing.piece : null;
  useEffect(() => {
    if (!filed) return;
    photo.reset();
    start([filed]);
  });
  const reading = photo.filing.phase === 'uploading' || photo.filing.phase === 'reading';
  // Her words make ONE draft (plan 2026-11-03; look prompt PRD D6, D9), for the day when there is
  // one and for no day when there is not, dressed in the job; the drawer carries on with it as
  // soon as the job has made it. A prompt never deals suggestions to the deck.
  const [weatherOff, setWeatherOff] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [promptJob, setPromptJob] = useState<string | null>(null);
  // Her words once sent (16 Nov): they leave the box for the conversation above it, Robes at work
  // under them, until the draft opens; a send that fails puts them back in the box.
  const [sent, setSent] = useState<string | null>(null);
  // An empty send folds the box to the sparkle (docked prompt K6); the sparkle brings it back.
  const [folded, setFolded] = useState(false);
  const sentRef = useRef<string | null>(null);
  const unsend = useCallback(() => {
    const words = sentRef.current;
    sentRef.current = null;
    setSent(null);
    if (words !== null) {
      setPrompt(words);
      setFolded(false);
    }
  }, []);
  const followed = useJob(promptJob);
  const ended =
    followed.job && isTerminalJobStatus(followed.job.status) ? followed.job.status : null;
  const madeId = followed.job?.output?.lookIds?.[0] ?? null;
  const occasion = followed.job?.output?.occasion;
  // The draft the job made opens here, once.
  const opening = useRef(false);
  useEffect(() => {
    if (!madeId || opening.current) return;
    opening.current = true;
    void api
      .call('looks.get', { params: { id: madeId } })
      .then((made) => {
        setWaiting(false);
        refresh(made);
        onCreated(made, {
          words: sent ?? prompt.trim(),
          ...(occasion ? { occasion } : {}),
          sources: src.sources,
          ...(weatherOff ? { weatherOff } : {}),
        });
      })
      .catch((err) => {
        opening.current = false;
        setPromptJob(null);
        setWaiting(false);
        setBusy(false);
        unsend();
        toast({ message: errorCopy(err) });
      });
  });
  // The job ended without a draft: the wait ends with a word.
  useEffect(() => {
    if (!ended || madeId) return;
    setPromptJob(null);
    setWaiting(false);
    setBusy(false);
    unsend();
    toast({ message: copy.styleFailed });
  }, [ended, madeId, toast, unsend]);
  // The day's place, for the brief.
  const diary = useApi('today.get', undefined, { enabled: day !== undefined });
  const generate = async () => {
    const words = prompt.trim();
    if (words.length < 2 || busy) return;
    // Sent, the dock waits as the sparkle while Robes dresses the look, not an open box over
    // "Dressing it…" (Annie, 18 Nov); the draft's sparkle carries a dot once Robes asks.
    setFolded(true);
    sentRef.current = words;
    setSent(words);
    setPrompt('');
    setBusy(true);
    const tracked = (ok: boolean) =>
      track('prompt_submitted', {
        surface: day ? 'home' : 'create',
        intent: 'words',
        scope: day ? 'day' : 'none',
        ok,
      });
    try {
      const place = day
        ? (diary.data?.diary?.days.find((x) => x.date === day)?.place ?? null)
        : null;
      const { jobId } = await api.call('looks.prompt', {
        input: {
          prompt: words,
          ...(day ? { date: day } : {}),
          draft: true,
          balance: src.balance,
          ...(place && !weatherOff ? { place } : {}),
          ...(day && weatherOff ? { weather: false } : {}),
        },
      });
      tracked(true);
      setPromptJob(jobId);
      setWaiting(true);
    } catch (err) {
      tracked(false);
      setBusy(false);
      unsend();
      toast({ message: errorCopy(err) });
    }
  };
  const stand = model.data?.stand?.imageUrl ?? null;
  return (
    <Shell
      presentation={presentation}
      title={copy.title}
      h1={copy.newName}
      onClose={onClose}
      done={{ label: copy.done, onClick: () => undefined, disabled: true, testId: 'draft-done' }}
      // The prompt box floats at the foot, in thumb reach from the start (look prompt PRD F23).
      dock={{
        startAtEnd: true,
        node: (
          // The bar: the box before her send, then "Dressing it…" until the draft takes over (K7).
          <PromptDock
            state={folded ? 'spark' : 'bar'}
            first={sent === null}
            line={sent === null ? null : d.dressing}
            working={sent !== null}
            dot={false}
            expandable={false}
            onRestore={() => setFolded(false)}
            onExpand={() => undefined}
            onCollapse={() => undefined}
          >
            <StylingCard
              {...(day && sent === null
                ? {
                    context: (
                      <DayContext date={day} weatherOff={weatherOff} onWeatherOff={setWeatherOff} />
                    ),
                  }
                : {})}
              sources={src.sources}
              onSource={(which) =>
                which === 'wardrobe' && src.empty ? setEmptyWardrobe(true) : src.toggle(which)
              }
              wardrobeEmpty={src.empty}
              placeholders={copy.placeholders}
              value={prompt}
              onChange={setPrompt}
              onSend={() => void generate()}
              emptySend="minimise"
              onEmpty={() => setFolded(true)}
              busy={busy}
            />
          </PromptDock>
        ),
      }}
    >
      <div className="relative overflow-hidden bg-surface-sunk">
        {stand ? (
          <Image src={stand} alt={lookbook.figure.alt} aspect="4:5" />
        ) : model.isPending ? (
          <Skeleton className="aspect-[4/5] w-full" />
        ) : (
          <div
            aria-hidden
            className="flex aspect-[4/5] w-full items-center justify-center bg-surface"
          >
            <Icon name="user" size={160} className="text-border-control" />
          </div>
        )}
        {reading ? <ReadingChip /> : null}
        {waiting ? <Scanning line={d.dressing} corner /> : null}
      </div>
      <div className="flex flex-col gap-3 px-5 pt-3">
        <Tabs
          items={TABS}
          value={TABS[0]}
          onChange={() => undefined}
          label={lookbook.savedLook.tabs.pieces}
        />
        <RackCard
          hasWardrobe={hasWardrobe}
          onClick={() => (hasWardrobe ? setPicker({ add: true }) : setAdding(true))}
        />
      </div>
      <EmptyWardrobeAlert
        open={emptyWardrobe}
        onClose={() => setEmptyWardrobe(false)}
        onAdd={() => setAdding(true)}
      />
      <PiecePicker
        mode={picker}
        onRack={[]}
        onClose={() => setPicker(null)}
        onPick={start}
        onSnap={(file) => void photo.file(file)}
      />
      <AddPiecesSheet
        open={adding}
        onClose={() => setAdding(false)}
        onPhoto={(file) => void photo.file(file)}
        draft
      />
      <AlertDialog
        open={full !== null}
        title={lookbook.drafts.fullTitle}
        message={full ? lookbook.drafts.fullBody(full.oldest) : undefined}
        actions={[
          {
            label: lookbook.drafts.letGo,
            variant: 'primary',
            onClick: () => {
              const input = full?.input;
              setFull(null);
              if (input) void create({ ...input, letGoOldest: true });
            },
          },
          { label: lookbook.drafts.keep, variant: 'outline', onClick: () => setFull(null) },
        ]}
        onDismiss={() => setFull(null)}
      />
    </Shell>
  );
}

function DraftBody({
  look,
  forDay,
  images,
  brief,
  schedule,
  presentation,
  onClose,
}: {
  look: Look;
  forDay: string | null;
  images?: 'add';
  // Her words, when Robes made this draft from them just now (the draft's first send), and the
  // occasion Robes read in them.
  brief?: DraftBrief;
  schedule: boolean;
  presentation: DraftPresentation;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  // A saved look is always in edit mode (D17): its changes wait for Update look.
  const mode: 'draft' | 'edit' = look.status === 'saved' ? 'edit' : 'draft';
  const letGo = useLetGo(lookbook.discarded);
  const remove = useLetGo(looksCopy.page.removed);
  const model = useApi('me.model.get');
  const summary = useApi('wardrobe.summary');
  const owned = summary.data?.total ?? null;
  const hasWardrobe = owned !== null && owned > 0;
  const src = useSources(owned, brief?.sources ?? null);
  const [emptyWardrobe, setEmptyWardrobe] = useState(false);
  // Her pick on the toggle; until she makes one the Rack opens as `rackLayoutFor` says.
  const [pickedLayout, setRackLayout] = useState<WardrobeLayout | null>(null);
  const [editingPieces, setEditingPieces] = useState(false);
  const [adding, setAdding] = useState(false);
  // Left out on New look, the weather stays out of the draft it made (look prompt improvements B4).
  const [weatherOff, setWeatherOff] = useState(brief?.weatherOff === true);
  // A saved look carries no place and no weather, even on a day (look prompt PRD L1, L2): both
  // belong to the day, never to the look.
  const askContext = useAskContext(mode === 'edit' ? null : forDay, weatherOff);
  const adjustRef = useRef<Adjust | null>(null);
  const editor = useLookEditor(look, { onChange: () => adjustRef.current?.changed() });
  const adjust = useAdjust(look, editor, mode === 'edit' ? 'saved' : 'draft');
  adjustRef.current = adjust;
  // Robes asks its one question about the look it just made (look prompt PRD F1, F3).
  const opened = useRef(false);
  // A draft Robes made, opened again, is asked about too: its thumbs are the way to change it or
  // restyle it all, now Dress it again is gone (decision 12).
  // Made from her words, the draft opens while its picture is still drawn: Robes works under her
  // line, and asks once the picture lands (16 Nov).
  const dressing = look.framePending || look.onModel === 'pending';
  const toAsk = useRef<{ occasion?: string } | null>(null);
  useEffect(() => {
    if (toAsk.current && !dressing) {
      adjust.asks(toAsk.current.occasion);
      toAsk.current = null;
    }
    if (opened.current) return;
    if (brief) {
      opened.current = true;
      adjust.opened(brief.words, brief.occasion, dressing);
      if (dressing) toAsk.current = brief.occasion ? { occasion: brief.occasion } : {};
    } else if (mode === 'draft' && look.setId !== null && !captureDraft) {
      opened.current = true;
      adjust.opened('');
    }
  });
  const fb = copy.feedback;
  // What she tapped after a thumbs down stands for her words (F10).
  const picked = adjust.state.reasons.length > 0 || adjust.state.restyle;
  const lastReason = adjust.state.reasons.at(-1);
  const feedbackHint = adjust.state.restyle
    ? fb.restyle.example
    : lastReason
      ? fb.reasons[lastReason].example
      : adjust.state.verdict === 'down'
        ? fb.placeholderDown
        : adjust.state.verdict === 'ask'
          ? fb.placeholder
          : null;
  // A look from her photograph (Capture PRD 1c): The Rack finds, matches and adds its pieces.
  const capture = useCaptureRack(look, editor);
  // A draft from her photograph is the photograph and its rack: no prompt card, no Generate.
  const captureDraft = capture.on && mode === 'draft';
  // The capture rack lists its pieces as they are found: the Rack's controls wait for the rack.
  const capturePieces = capture.on && (captureDraft || capture.stage !== 'rack');
  const [newPiece, setNewPiece] = useState<string | null>(null);
  useDressOnOpen(look);
  const save = useSaveLook(
    (saved) => {
      // Saved for a day: it is on that day and in the Lookbook, and she goes back to the screen
      // the day was on — Home's day, or the Diary's day page. Else the saved look opens with the
      // diary up, so it can be scheduled in the same breath.
      if (forDay) router.replace(dayReturn(forDay, saved.id));
      else router.replace(`/look/${saved.id}?schedule=1`);
    },
    'draft',
    () => adjust.changeCount(),
  );
  const update = useApiMutation('looks.update', {
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.call('looks.get', { params: { id: look.id } }), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [subview, setSubview] = useState<'tags' | 'seasons' | 'worn' | null>(null);
  const [diary, setDiary] = useState(schedule);
  // `?schedule=1` opened the diary once; the address drops it so Back never re-opens it.
  useEffect(() => {
    if (schedule) window.history.replaceState(null, '', `/look/${look.id}`);
  }, [schedule, look.id]);
  // Image mode (D19): opened from Home's + it starts on Add a photo, and so does the Edit look
  // drawer, whose picture is the photo strip (Capture PRD 3.1).
  const stripFirst = images === 'add' || (mode === 'edit' && presentation === 'drawer');
  const [managing, setManaging] = useState(stripFirst);
  const stack = useImageStage(look);
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null);
  const [prompt, setPrompt] = useState('');
  const rows = editor.rack.rows;
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const pieceOf = (id: string) => piecesById.get(id) ?? capture.pieceOf(id);
  const wishOf = useWishOf();
  const wishFor = (row: RackRow) => wishOf(row.proposal?.wishlistItemId);
  const imageOf = (row: RackRow) =>
    row.pieceId ? pieceOf(row.pieceId)?.image : (wishFor(row)?.image ?? null);
  // Robes' look opens on the tiles and hers on the list; either opens on the list once more than
  // two in five of its pieces have no photograph to tile (Annie, 18 Nov). Read on every render, so
  // wishes that load after the look still count. Native twin: DraftLook.tsx.
  const rackLayout = pickedLayout ?? rackLayoutFor(look.composedByRobes, rows.map(imageOf));
  // The photograph of the piece a change swapped out of a row, for its Swapped pill (T3).
  const wasImageOf = (key: string) => {
    const was = editor.rack.edits[key]?.was;
    return was ? (imageOf(was) ?? null) : null;
  };
  // A wish on the rack opens its own page (Annie, 15 Nov); a proposal Robes made has none.
  const hrefOf = (row: RackRow) =>
    row.pieceId
      ? `/piece/${row.pieceId}`
      : wishFor(row)
        ? `/wardrobe/wishlist/${row.proposal?.wishlistItemId}`
        : undefined;
  const sendOpts = {
    balance: src.balance,
    ...(askContext ? { context: askContext } : {}),
  };
  // A photograph filed from the picker lands where the picker was opened.
  const photo = usePhotoFiling();
  const snapFor = useRef<PickerMode>({ add: true });
  const filed = photo.filing.phase === 'filed' ? photo.filing.piece : null;
  useEffect(() => {
    if (!filed) return;
    photo.reset();
    if ('swap' in snapFor.current) editor.swap(snapFor.current.swap.key, { piece: filed });
    else editor.add(filed);
  });
  const reading = photo.filing.phase === 'uploading' || photo.filing.phase === 'reading';
  const busy = adjust.busy || save.isPending || editor.saving || stack.committing;
  const words = prompt.trim();
  // A saved look's edit: anything not yet applied with Update look (D17, D18). Her photographs
  // and the cover are not among them: the strip's ✓ keeps them (keepStrip).
  // Words in the prompt are not among them: the prompt sends and keeps its own changes.
  const pending = mode === 'edit' && (editor.dirty || adjust.stale);
  // A look from her photograph saves at any point but while its pieces are being found (1c.10).
  const finding = capture.on && capture.stage === 'finding';
  // A saved look's ✓ is Update look by another name: both wait, greyed, until something changes
  // (Capture PRD 3.1, 3.5); × leaves.
  const canDone =
    mode === 'draft'
      ? (rows.length > 0 || look.image !== null) && !busy && !finding
      : pending && !busy;
  // Update look keeps what she changed by hand: her photographs and the cover first, then the
  // rack and a redraw for changed pieces. The cover she chose stays in front; a hidden Robes'
  // picture comes back as the cover (D19).
  const commit = async () => {
    if (!(await stack.commit())) return;
    if (editor.dirty) {
      if (!(await editor.update())) return;
    } else toast({ message: lookbook.updated, duration: UPDATED_MS });
    src.settle();
    adjust.drawForSave();
  };
  const apply = () => {
    if (mode !== 'edit' || busy || !pending) return;
    void commit();
  };
  // A saved look's prompt keeps its own change (redline 14 Nov, pin 25): once Robes has answered
  // on the rack, the rack is written and the model wears it, with no button and nothing said.
  const [applying, setApplying] = useState<'asked' | 'reading' | null>(null);
  const keep = async () => {
    if (!editor.dirty) return;
    if (!(await editor.update(true))) return;
    src.settle();
    adjust.drawNow();
  };
  useEffect(() => {
    if (applying === 'asked' && adjust.busy) setApplying('reading');
    if (applying === 'reading' && !adjust.busy) {
      setApplying(null);
      void keep();
    }
  });
  const done = () => {
    if (!canDone) return;
    if (mode === 'draft') {
      // A draft's photographs are kept as it is saved.
      void stack.commit().then((ok) => {
        if (!ok) return;
        // Her photograph is the picture: nothing is drawn for a look from it.
        if (!capture.on) adjust.drawForSave();
        save.mutate({ params: { id: look.id }, input: forDay ? { date: forDay } : {} });
      });
      return;
    }
    apply();
  };
  // The strip's ✓ (design "Add a photo to a look"): the card in focus goes in front. A saved
  // look keeps its photographs and cover there and then, never waiting for Update look; a
  // draft's are kept as it is saved.
  const keepStrip = (front: StageCard | null) => {
    const next = front ? stageInFront(stack.stage, front) : stack.stage;
    if (mode === 'draft') {
      stack.update(() => next);
      setManaging(false);
      return;
    }
    void stack.commit(next).then((ok) => {
      if (ok) setManaging(false);
    });
  };
  const close = () => {
    // A strip left open without its ✓ still asks, so a photo she added is never lost unasked.
    if (mode === 'edit' && !pending && !stack.changed) {
      onClose();
      return;
    }
    // A photograph she has done nothing with yet is let go without a question (PRD 1c.10).
    if (captureDraft && !capture.touched && !stack.changed && rows.length === 0) {
      discard();
      return;
    }
    setConfirm('discard');
  };
  const discard = () => {
    setConfirm(null);
    if (mode === 'edit') {
      setPrompt('');
      editor.discard();
      stack.reset();
      onClose();
      return;
    }
    letGo(look.id);
    if (forDay) router.replace(dayReturn(forDay));
    else onClose();
  };
  const del = () => {
    setConfirm(null);
    remove(look.id);
    router.replace('/looks');
  };
  // The box's send (look prompt PRD P2): her words go through the thread and the picture is drawn
  // once the rack is answered. The drawer stays open on the conversation, capped so the look shows
  // above it (look prompt improvements B6, Annie 16 Nov).
  const generate = () => {
    if (busy || (!words && !picked)) return;
    adjust.send(words, { ...sendOpts, draw: true });
    setPrompt('');
  };
  // A saved look's send asks, and what Robes changes is kept and drawn as it lands.
  const ask = () => {
    if (busy || (!words && !picked) || rows.length === 0) return;
    if (adjust.send(words, sendOpts)) setApplying('asked');
    setPrompt('');
  };
  // A draft's model wears the rack as she builds it (Annie, 16 Nov): pieces added, swapped or
  // taken off by hand dress it at once, the picks of one moment in one picture, and a draft that
  // has pieces but no picture yet is dressed as it opens. Not while a picture is being drawn, nor
  // again after one failed; Robes' own photograph is the picture of a look it made, and her
  // photograph of a captured one. A saved look's changes still wait for Update look (D17).
  // Native twin: DraftLook.tsx.
  const handBuilt = mode === 'draft' && !captureDraft && !look.frame && rows.length > 0;
  const undressed = look.model === null && (look.onModel ?? null) === null;
  const toDress =
    handBuilt && !adjust.busy && look.onModel !== 'pending' && (adjust.stale || undressed);
  // biome-ignore lint/correctness/useExhaustiveDependencies: another pick restarts the wait
  useEffect(() => {
    if (!toDress) return;
    const t = setTimeout(() => adjustRef.current?.dress(), DRESS_SETTLE_MS);
    return () => clearTimeout(t);
  }, [toDress, adjust.badge]);
  const dialog =
    confirm === 'delete'
      ? {
          title: lookbook.savedLook.deleteTitle,
          message: lookbook.savedLook.deleteBody,
          actions: [
            { label: lookbook.savedLook.delete, variant: 'danger' as const, onClick: del },
            {
              label: lookbook.savedLook.cancel,
              variant: 'quiet' as const,
              onClick: () => setConfirm(null),
            },
          ],
        }
      : confirm === 'discard'
        ? {
            title:
              mode === 'edit'
                ? copy.discardEdit.title
                : captureDraft
                  ? copy.capture.discard.title
                  : copy.discard.title,
            message:
              mode === 'edit'
                ? copy.discardEdit.body
                : captureDraft
                  ? copy.capture.discard.body
                  : copy.discard.body,
            actions: [
              { label: copy.discard.discard, variant: 'primary' as const, onClick: discard },
              {
                label: copy.discard.keep,
                variant: 'outline' as const,
                onClick: () => setConfirm(null),
              },
              ...(mode === 'draft'
                ? [{ label: copy.discard.later, variant: 'quiet' as const, onClick: onClose }]
                : []),
            ],
          }
        : null;
  // The rows: a piece found in her photograph and not filed yet is a CaptureRow; every other is
  // the look's own row (a filed piece of a captured draft opens its piece and shows its wears).
  const rackRows = rows.map((row) =>
    isCaptureRow(row) ? (
      <CaptureRow
        key={row.key}
        row={row}
        look={look}
        capture={capture}
        onMatch={() =>
          setPicker({
            match: {
              key: row.key,
              name: row.name,
              category: row.category,
              suggestedId: capture.suggested(row)?.id ?? null,
            },
          })
        }
        onAdd={() => setNewPiece(row.key)}
      />
    ) : (
      <RackRowCard
        key={row.key}
        row={row}
        image={imageOf(row)}
        mark={captureDraft ? null : editor.mark(row.key)}
        wasImage={wasImageOf(row.key)}
        styled={editor.rack.styling[row.key]}
        {...((mode === 'edit' || captureDraft) && row.pieceId
          ? { wears: pieceOf(row.pieceId)?.wearCount ?? 0 }
          : {})}
        {...(row.proposal && editingPieces ? { onWish: () => editor.wish(row.key) } : {})}
        editing={editingPieces}
        {...(!row.pieceId && hrefOf(row) ? { wishHref: hrefOf(row) as string } : {})}
        {...(editingPieces
          ? {
              onSwap: () =>
                setPicker({
                  swap: { key: row.key, name: row.name, category: row.category },
                }),
              onRemove: () => editor.remove(row.key),
            }
          : {})}
      />
    ),
  );
  // The docked prompt (docked prompt PRD K1–K9): the sparkle, the bar or the open thread. A draft
  // waiting for her words opens at the bar (K2); one she is building by hand (no set and no brief:
  // Robes made none of it) rests as the sparkle,
  // so the bar never covers the rack she is working on (Annie, 18 Nov); a saved look rests as the
  // sparkle. A thumbs up, or an empty send, folds it to
  // the sparkle (K6); a thumbs down opens the thread on what to change; the grabber and the close
  // move between the bar and the thread, and a tap on the dimmed look folds the thread (K8).
  // Native twin: DraftLook.tsx.
  const { track } = useAnalytics().analytics;
  const verdict = adjust.state.verdict;
  const dockContext = mode === 'draft' ? 'draft' : 'saved';
  const [dock, setDock] = useState<DockState>(() =>
    // Opened from her sent words, Robes is dressing it or about to ask: the sparkle, whose dot says
    // when (Annie, 18 Nov). Built by hand, the sparkle too; otherwise the bar (K2).
    brief !== undefined || (handBuilt && look.setId === null) ? 'spark' : dockStart(dockContext),
  );
  const move = (m: DockMove) => setDock((from) => dockNext(from, m));
  const dockWas = useRef(dock);
  useEffect(() => {
    if (dockWas.current === dock) return;
    track('dock_state_changed', { from: dockWas.current, to: dock, context: dockContext });
    dockWas.current = dock;
  }, [dock, dockContext, track]);
  // A draft that opens while Robes still draws its picture waits as the sparkle, not an open box
  // over "Dressing it…"; its dot says when Robes asks how it feels (Annie, 18 Nov). Later redraws
  // keep the dock where she left it.
  const [openedDressing] = useState(() => mode === 'draft' && dressing);
  const firstDress = openedDressing && dressing;
  useEffect(() => {
    if (firstDress) setDock('spark');
  }, [firstDress]);
  // On a saved look her send puts the dock away to the sparkle while Robes works, as a draft does
  // while it is first dressed; the sparkle's dot says when Robes has answered, a question or its
  // words (Annie, 18 Nov).
  const savedWorking = mode !== 'draft' && adjust.busy;
  useEffect(() => {
    if (savedWorking) setDock('spark');
  }, [savedWorking]);
  const [unread, setUnread] = useState(false);
  const dockNow = useRef(dock);
  dockNow.current = dock;
  const turnCount = adjust.state.thread.length;
  const lastWho = adjust.state.thread.at(-1)?.who;
  // biome-ignore lint/correctness/useExhaustiveDependencies: each new turn is checked
  useEffect(() => {
    if (
      mode !== 'draft' &&
      dockNow.current === 'spark' &&
      (lastWho === 'robes' || lastWho === 'filed')
    )
      setUnread(true);
  }, [turnCount, lastWho, mode]);
  useEffect(() => {
    if (dock !== 'spark') setUnread(false);
  }, [dock]);
  useEffect(() => {
    if (verdict === 'up') setDock((from) => dockNext(from, 'minimise'));
    if (verdict === 'down') setDock((from) => dockNext(dockNext(from, 'restore'), 'expand'));
  }, [verdict]);
  const hasThread = adjust.state.thread.length > 0 || adjust.state.question !== null;
  const lastLine = adjust.state.thread.at(-1);
  const working = lastLine?.who === 'work';
  const said =
    (lastLine?.who === 'robes' || lastLine?.who === 'filed') && lastLine.text !== d.modelDone
      ? lastLine
      : null;
  // Her first send carries the day's place and weather into the conversation (pin 13).
  const briefed = adjust.state.thread.some((l) => l.who === 'her');
  const dayContext = forDay && mode === 'draft' ? forDay : null;
  // The look's pieces for Which piece? (Q6), in the thread and on the bar alike.
  const whichPieces = rows.map((r) => ({
    key: r.key,
    name: nameNoBrand(r.name, r.brand),
    image: imageOf(r) ?? null,
  }));
  // On the saved look's page the resting sparkle stands beside its one button (design 2c), while
  // that button stands (not while a prompt change is being kept).
  const besideButton = presentation === 'saved' && dock === 'spark' && applying === null;
  const dockNode = captureDraft ? null : (
    <PromptDock
      state={dock}
      first={!hasThread}
      line={
        working
          ? (lastLine?.text ?? null)
          : verdict === 'down'
            ? fb.change
            : (adjust.state.question ?? said?.text ?? null)
      }
      working={working}
      thumbs={verdict === 'ask' ? <Thumbs adjust={adjust} /> : null}
      answers={
        verdict !== 'down' ? null : (
          <Answers
            adjust={adjust}
            weather={askContext !== undefined}
            canRestyle={mode === 'draft' && adjust.canRedress}
            pieces={whichPieces}
          />
        )
      }
      dot={dockDot(dock, adjust.state) || (dock === 'spark' && unread)}
      beside={besideButton}
      conversation={
        hasThread ? (
          <>
            <ThreadLines
              thread={adjust.state.thread}
              compact
              {...(dayContext && !weatherOff ? { meta: <DayMeta date={dayContext} /> } : {})}
            />
            <Feedback
              adjust={adjust}
              weather={askContext !== undefined}
              canRestyle={mode === 'draft' && adjust.canRedress}
              pieces={whichPieces}
            />
          </>
        ) : null
      }
      onRestore={() => move('restore')}
      onExpand={() => move('expand')}
      onCollapse={() => move('collapse')}
      onMinimise={() => move('minimise')}
    >
      <StylingCard
        inline={hasThread}
        boxed={dock === 'thread'}
        {...(dayContext && !briefed
          ? {
              context: (
                <DayContext
                  date={dayContext}
                  weatherOff={weatherOff}
                  onWeatherOff={setWeatherOff}
                />
              ),
            }
          : {})}
        tokens={<FeedbackTokens adjust={adjust} />}
        sources={src.sources}
        onSource={(which) =>
          which === 'wardrobe' && src.empty ? setEmptyWardrobe(true) : src.toggle(which)
        }
        wardrobeEmpty={src.empty}
        {...(feedbackHint
          ? { placeholder: feedbackHint }
          : hasThread
            ? { placeholders: copy.placeholdersAfter }
            : mode === 'edit'
              ? { placeholder: copy.savedPlaceholder }
              : { placeholders: copy.placeholders })}
        {...(picked ? { emptySend: 'send' as const } : { emptySend: 'minimise' as const })}
        onEmpty={() => move('minimise')}
        value={prompt}
        onChange={setPrompt}
        onSend={mode === 'edit' ? ask : generate}
        busy={busy}
      />
    </PromptDock>
  );
  // Opened, the prompt is a sheet over the dimmed look in every presentation, and a saved look's
  // button steps away: changes are made through the prompt alone (pins 23, 25).
  const shellDock = dockNode
    ? {
        node: dockNode,
        ...(dock === 'thread' ? { onScrim: () => move('collapse') } : {}),
        ...(besideButton ? { beside: true } : {}),
      }
    : null;
  const footButton =
    // While the prompt is open or keeping its change there is no button at all (pin 25).
    mode === 'edit' &&
    (dock !== 'spark' ||
      applying !==
        null) ? undefined : // A saved look's one button (PRD rev 3 §6.1): Schedule look at rest, Update look while a
    // hand edit waits — never both. Native twin: DraftLook.tsx's footer.
    presentation === 'saved' && !pending ? (
      <Button variant="primary" block onClick={() => setDiary(true)} data-testid="schedule-look">
        {lookbook.savedLook.schedule}
      </Button>
    ) : mode === 'edit' ? (
      // The Edit look drawer's one accept (3k): she stays to see it land.
      <Button
        variant="primary"
        block
        onClick={apply}
        aria-disabled={!pending || busy}
        className={!pending || busy ? 'opacity-40' : undefined}
        data-testid="update-look"
      >
        {copy.update}
        <Icon name="undo" size={12} className="-scale-x-100" />
      </Button>
    ) : undefined;
  return (
    <Shell
      presentation={presentation}
      title={mode === 'edit' ? copy.editTitle : copy.title}
      h1={look.name}
      onClose={close}
      // One confirm per screen (audit P1): Edit look's accept is Update look at the foot, so its
      // header carries no ✓; a draft keeps the header ✓ that saves it.
      done={
        mode === 'edit'
          ? null
          : {
              label: copy.done,
              ...(forDay ? { hint: copy.doneForDay } : {}),
              onClick: done,
              disabled: !canDone,
              testId: 'draft-done',
            }
      }
      {...(footButton ? { footer: footButton } : {})}
      dock={shellDock}
    >
      {managing ? (
        <ImageManager
          look={look}
          stage={stack.stage}
          onStage={stack.update}
          onDone={keepStrip}
          busy={stack.committing}
          focusAdd={stripFirst}
          {...(presentation === 'saved' ? { onBack: close } : {})}
        />
      ) : (
        <DraftPhoto
          look={look}
          model={model.data}
          modelPending={model.isPending}
          stale={adjust.stale}
          redressing={adjust.busy && !adjust.state.asking}
          chip={reading ? lookbook.figure.reading : null}
          pronoun={pronoun(model.data)}
          onImages={() => setManaging(true)}
          onRetry={adjust.updateModel}
          stage={stack.stage}
          {...(presentation === 'saved' ? { onBack: close } : {})}
        />
      )}
      <div className="flex flex-col gap-3 px-5 pt-3">
        <Tabs
          items={TABS}
          value={tab}
          onChange={(next) => {
            setTab(next);
            // Edit lives on the Pieces tab only: switching to Details ends it (docked prompt E1).
            if (next !== TABS[0]) setEditingPieces(false);
          }}
          label={lookbook.savedLook.tabs.pieces}
          trailing={
            tab === TABS[0] && rows.length > 0 && !capturePieces ? (
              <RackControls
                layout={rackLayout}
                onLayout={setRackLayout}
                editing={editingPieces}
                onEditing={setEditingPieces}
              />
            ) : undefined
          }
        />
        {tab === TABS[0] ? (
          <div className="flex flex-col gap-3" data-testid="pieces-tab">
            {capturePieces ? (
              <CapturePieces look={look} capture={capture}>
                {rackRows}
              </CapturePieces>
            ) : (
              <>
                <Rack
                  rows={rows}
                  imageOf={imageOf}
                  layout={rackLayout}
                  editing={editingPieces}
                  hasWardrobe={hasWardrobe}
                  onAdd={() => (hasWardrobe ? setPicker({ add: true }) : setAdding(true))}
                  hrefOf={hrefOf}
                  onSwap={(row) =>
                    setPicker({ swap: { key: row.key, name: row.name, category: row.category } })
                  }
                  onRemove={(row) => editor.remove(row.key)}
                >
                  {rackRows}
                </Rack>
                <RemovedLine capture={capture} />
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <LookDetails
              look={look}
              onTags={() => setSubview('tags')}
              onSeasons={() => setSubview('seasons')}
              // A draft has no wears (Q5); a saved look's Worn row opens WornView.
              {...(mode === 'edit' ? { onWorn: () => setSubview('worn') } : {})}
              // The Caption is the name (D16).
              onCaption={(name) => update.mutate({ params: { id: look.id }, input: { name } })}
              {...(mode === 'edit'
                ? {
                    photos: {
                      count: stageCards(lookStack(look), stack.stage).length,
                      onOpen: () => setManaging(true),
                    },
                  }
                : {})}
            />
            {mode === 'edit' ? (
              // Delete (D9), asked first. Felix keeps both reds off text: the link is ink-soft on a
              // hairline underline, and danger fills only the confirm's Delete (redline 7 Nov).
              <button
                type="button"
                onClick={() => setConfirm('delete')}
                className={`min-h-11 self-start font-sans text-ink-muted text-sm underline decoration-[0.5px] underline-offset-4 hover:text-ink ${focus}`}
              >
                {copy.delete}
              </button>
            ) : null}
          </div>
        )}
      </div>
      <EmptyWardrobeAlert
        open={emptyWardrobe}
        onClose={() => setEmptyWardrobe(false)}
        onAdd={() => setAdding(true)}
      />
      <PiecePicker
        mode={picker}
        onRack={onRackIds(rows)}
        onClose={() => setPicker(null)}
        onPick={(pieces, wishes) => {
          if (!picker) return;
          if ('swap' in picker) {
            const [piece] = pieces;
            const [wish] = wishes;
            if (piece) editor.swap(picker.swap.key, { piece });
            else if (wish) editor.swap(picker.swap.key, { wish });
            return;
          }
          if ('match' in picker) {
            const [piece] = pieces;
            if (piece) capture.match(picker.match.key, piece, 'match');
            return;
          }
          for (const piece of pieces) editor.add(piece);
          for (const wish of wishes) editor.addWish(wish);
        }}
        onSnap={(file) => {
          if (picker && !('match' in picker)) snapFor.current = picker;
          void photo.file(file);
        }}
        {...(picker && 'match' in picker ? { onAddNew: () => setNewPiece(picker.match.key) } : {})}
      />
      <NewPieceSheet
        row={rows.find((r) => r.key === newPiece) ?? null}
        look={look}
        capture={capture}
        onClose={() => setNewPiece(null)}
        onAdded={(piece) => {
          if (newPiece) capture.match(newPiece, piece, 'add');
        }}
      />
      <AddPiecesSheet
        open={adding}
        onClose={() => setAdding(false)}
        onPhoto={(file) => {
          snapFor.current = { add: true };
          void photo.file(file);
        }}
        draft
      />
      <TagsView look={look} open={subview === 'tags'} onBack={() => setSubview(null)} />
      <SeasonsView look={look} open={subview === 'seasons'} onBack={() => setSubview(null)} />
      {mode === 'edit' ? (
        <>
          <WornView
            look={look}
            open={subview === 'worn'}
            onBack={() => setSubview(null)}
            onAddDate={() => {
              setSubview(null);
              setDiary(true);
            }}
          />
          <DiarySheet look={diary ? look : null} onClose={() => setDiary(false)} />
        </>
      ) : null}
      <AlertDialog
        open={editor.full !== null}
        title={lookbook.drafts.fullTitle}
        message={lookbook.drafts.fullBody(editor.full?.oldest ?? lookbook.draftTile.untitled)}
        actions={[
          { label: lookbook.drafts.letGo, variant: 'primary', onClick: editor.letGo },
          { label: lookbook.drafts.keep, variant: 'outline', onClick: editor.keep },
        ]}
        onDismiss={editor.keep}
      />
      <AlertDialog
        open={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message}
        actions={dialog?.actions ?? []}
        onDismiss={() => setConfirm(null)}
      />
    </Shell>
  );
}

function ReadingChip() {
  return (
    <span
      role="status"
      className="pointer-events-none absolute top-[44%] left-1/2 -translate-x-1/2 rounded-pill bg-bg/85 px-4 py-2 font-sans text-[10px] text-ink uppercase tracking-[0.2em] backdrop-blur"
    >
      {lookbook.figure.reading}
    </span>
  );
}

// The picture: Robes' frame or her model wearing the rack — the model's base layer before
// anything is drawn — full-bleed at 4:5 on `cream-100`. Stale (dimmed, with the count it is
// behind) until she asks; scanned while it is drawn; the image stack bottom-right opens the
// ImageManager. It carries no styling control: changes go through the prompt (docked prompt M1).
function DraftPhoto({
  look,
  model,
  modelPending,
  stale,
  redressing,
  chip,
  pronoun,
  onImages,
  onRetry,
  stage,
  onBack,
}: {
  look: Look;
  model: Model | undefined;
  modelPending: boolean;
  stale: boolean;
  redressing: boolean;
  chip: string | null;
  pronoun: string;
  onImages: () => void;
  onRetry: () => void;
  // What she has done in image mode and not yet applied: its front card shows here.
  stage: ImageStage;
  // The saved look's page (3e): the back disc top-left is the way out.
  onBack?: () => void;
}) {
  const base = lookStack(look);
  const staged = stageChanged(base, stage) ? stageFront(base, stage) : null;
  const own = look.photo !== null && look.record === 'photo';
  const rendered = own
    ? look
    : look.image
      ? look
      : look.model?.status === 'ready'
        ? { ...look, image: look.model }
        : null;
  // The last picture drawn stays up, greyed, while the rack has moved on and the next is drawn
  // (redline 14 Nov): the look never falls back to the bare model between two pictures.
  const last = useRef<{ id: string; shown: NonNullable<typeof rendered> } | null>(null);
  // A picture still being made is on the look before it can be shown (its renditions come
  // later), so "drawn" means there is something to show, never merely that an image is named.
  const drawn = own || (rendered?.image?.renditions.length ?? 0) > 0 ? rendered : null;
  if (drawn?.image) last.current = { id: look.id, shown: drawn };
  const held =
    !drawn && !own && last.current?.id === look.id
      ? { ...look, image: last.current.shown.image }
      : null;
  const picture = drawn ?? held;
  const stand = model?.stand?.imageUrl ?? (model?.filed ? model.cell.imageUrl : null);
  const drawing = look.framePending || look.onModel === 'pending' || redressing;
  const line = useDressingLine(
    look.pieces.length || look.setId ? d.linesAgain : d.linesFirst,
    drawing,
  );
  const failed = !drawing && look.onModel === 'failed' && !own;
  const glass =
    "absolute z-10 flex items-center justify-center rounded-pill bg-veil-soft text-ink backdrop-blur-[8px] after:absolute after:-inset-2.5 after:content-['']";
  return (
    <div className="relative overflow-hidden bg-surface-sunk" data-testid="draft-photo">
      <div
        className={`transition-[opacity,filter] duration-500 ${(stale || held) && !drawing ? 'opacity-80 grayscale-[.75]' : ''} ${drawing ? 'opacity-60' : ''}`}
        data-testid={stale && !drawing ? 'draft-picture-stale' : 'draft-picture'}
      >
        {staged ? (
          <CardPicture
            look={look}
            card={staged}
            alt={staged.kind === 'robes' ? lookbook.savedLook.manager.robes : look.name}
          />
        ) : look.frame && !own ? (
          <LookPicture look={look} />
        ) : picture ? (
          <LookImage look={picture} priority sizes="(min-width: 448px) 448px, 100vw" />
        ) : stand ? (
          <Image src={stand} alt={lookbook.figure.alt} aspect="4:5" />
        ) : modelPending ? (
          <Skeleton className="aspect-[4/5] w-full" />
        ) : (
          <div
            aria-hidden
            className="flex aspect-[4/5] w-full items-center justify-center bg-surface"
          >
            <Icon name="user" size={160} className="text-border-control" />
          </div>
        )}
      </div>
      {drawing ? <Scanning line={line || d.dressing} corner /> : null}
      {chip ? (
        <span
          role="status"
          className="pointer-events-none absolute top-[44%] left-1/2 -translate-x-1/2 rounded-pill bg-bg/85 px-4 py-2 font-sans text-[10px] text-ink uppercase tracking-[0.2em] backdrop-blur"
        >
          {chip}
        </span>
      ) : null}
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={lookbook.savedLook.back}
          title={lookbook.savedLook.back}
          data-testid="saved-look-back"
          className={`${glass} ${focus} top-2.5 left-3 size-9`}
        >
          <Icon name="back" size={20} className="-ml-0.5" />
        </button>
      ) : null}
      {failed ? (
        // The re-draw failed: say so, never pass the old picture off; a tap draws it again.
        <button
          type="button"
          onClick={onRetry}
          className={`absolute top-3 right-3 z-10 min-h-11 rounded-pill border border-hairline bg-bg/90 px-3 font-sans text-ink text-xs ${focus}`}
        >
          {lookbook.figure.undressed(pronoun)}
        </button>
      ) : null}
      <ImageStack look={look} onOpen={onImages} />
    </div>
  );
}
