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
  defaultBalance,
  type ImageStage,
  type RackRow,
  stageChanged,
  stageFront,
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
  useToast,
  useToastLiftOver,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useHideBack, usePushedView } from '@/components/shell/app-shell';
import { AddPiecesSheet } from '@/components/wardrobe/add/add-pieces-sheet';
import { LayoutToggle } from '@/components/wardrobe/wardrobe-header';
import { type Adjust, useAdjust } from '@/lib/adjust';
import { errorCopy } from '@/lib/error-copy';
import { usePhotoFiling } from '@/lib/file-photo';
import { onRackIds, useLookEditor } from '@/lib/look-editor';
import { useImageStage } from '@/lib/look-images';
import { isDraftsFull, useLetGo, useRefreshLooks, useSaveLook } from '@/lib/look-states';
import { useJob } from '@/lib/use-job';
import { ThreadLines } from './adjust-dock';
import { DayContext } from './day-context';
import { DiarySheet } from './diary-sheet';
import { AdjustSheet, DescribeSheet } from './draft-sheets';
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
import { StylingCard } from './styling-card';
import { TagsView } from './tags-view';
import { WornView } from './worn-view';

const copy = lookbook.draftLook;
const d = lookbook.draft;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const TABS = [lookbook.savedLook.tabs.pieces, lookbook.savedLook.tabs.details] as const;
type Tab = (typeof TABS)[number];

// `drawer` over the screen that opened it; `page` on a deep link; `saved` is a saved look's own
// page (Felix 3e: the back disc on the photo, Schedule look at the foot — Update look in its place
// while a change waits, PRD §6.1; D17).
export type DraftPresentation = 'drawer' | 'page' | 'saved';
export type DraftSheet = 'adjust' | 'describe';

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

// The Shop toggle's state (Front Door PRD rev 3 §4.6, plan R1): off once she has a wardrobe to
// style from, on when there is nothing else, until she says otherwise. `owned` is null while
// the wardrobe's count loads.
function useShop(owned: number | null): {
  on: boolean;
  set: (next: boolean) => void;
  balance: Balance;
  // Flipped since the look was last applied (a saved look's Update, PRD §6.1).
  changed: boolean;
  settle: () => void;
} {
  const [chosen, setChosen] = useState<boolean | null>(null);
  const [applied, setApplied] = useState<boolean | null>(null);
  const rest = owned === null ? false : defaultBalance(owned) === 'mix';
  const on = chosen ?? rest;
  return {
    on,
    set: setChosen,
    balance: on ? 'mix' : 'owned',
    changed: chosen !== null && on !== (applied ?? rest),
    settle: () => setApplied(on),
  };
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

// The Rack (PRD §4.6): its heading with the grid | list toggle, the rows or the tiles, and the
// Rack card under them as the add slot. Before the first piece the card stands alone.
function Rack({
  rows,
  imageOf,
  layout,
  onLayout,
  editing,
  onEditing,
  saved,
  hasWardrobe,
  onAdd,
  children,
}: {
  rows: readonly RackRow[];
  imageOf: Parameters<typeof RackGrid>[0]['imageOf'];
  layout: WardrobeLayout;
  onLayout: (next: WardrobeLayout) => void;
  // Edit-pieces mode (PRD §6.2, plan R2): the pencil ink-filled, the rows' swap and × out.
  editing: boolean;
  onEditing: (next: boolean) => void;
  // A saved look's add slot is the small hanger under the list (§6.1); a draft keeps the card.
  saved: boolean;
  hasWardrobe: boolean;
  onAdd: () => void;
  // The rows, as RackRowCards.
  children: ReactNode;
}) {
  if (rows.length === 0) return <RackCard hasWardrobe={hasWardrobe} onClick={onAdd} />;
  return (
    <div className="flex flex-col gap-2.5" data-testid="the-rack">
      <div className="flex h-11 items-center justify-between gap-3">
        {/* The canvas's heading (PRD §6.1): "The Rack" in the serif, warm and quiet. */}
        <h2 className="flex-1 font-display font-normal text-[17px] text-ink-faint tracking-[0.01em]">
          {copy.rack}
        </h2>
        <LayoutToggle layout={layout} onLayout={onLayout} />
        <button
          type="button"
          aria-label={copy.editPieces}
          title={copy.editPieces}
          aria-pressed={editing}
          onClick={() => onEditing(!editing)}
          data-testid="rack-pencil"
          className={`flex size-11 shrink-0 items-center justify-center rounded-pill border ${
            editing
              ? 'border-ink bg-ink text-bg'
              : 'border-rule-mid bg-surface-raised text-ink hover:border-border-control'
          } ${focus}`}
        >
          <Icon name="pencil" size={16} />
        </button>
      </div>
      {layout === 'grid' ? (
        <>
          <RackGrid rows={rows} imageOf={imageOf} />
          {saved ? <PieceList onAdd={onAdd}>{null}</PieceList> : null}
        </>
      ) : (
        <PieceList label={lookbook.rack.title(rows.length)} {...(saved ? { onAdd } : {})}>
          {children}
        </PieceList>
      )}
      {saved ? null : <RackCard hasWardrobe={hasWardrobe} onClick={onAdd} testId="rack-card-add" />}
    </div>
  );
}

// The draft look (Felix DraftLook; plan 2026-11-06 D14, D17, D18): ONE component for every draft
// — from Describe, built by hand, started from a piece — and for a saved look, which edits in
// place on its own page (3e) and in the Edit look drawer from Home (3k). The header carries × and the ink done disc; under the photo (the adjust
// disc, the image stack) sit the name, Pieces · Details, the piece list with its add slot, and the
// prompt card whose Generate and the AdjustSheet's Send both feed the one thread (`useAdjust`)
// and draw the picture once it lands; "Dress it again" opens the DescribeSheet. `id` is a look,
// or 'new' before the first piece. The native twin is mobile/src/features/looks/DraftLook.tsx.
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
  const query = useApi(
    'looks.get',
    { params: { id: lookId ?? '' } },
    {
      enabled: lookId !== null,
      refetchInterval: (q) =>
        q.state.data?.onModel === 'pending' || q.state.data?.framePending ? 3_000 : false,
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
        onCreated={(made) => {
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
      presentation={presentation}
      onClose={onClose}
    />
  );
}

// The drawer, or the same anatomy on a page (a deep link, with no screen beneath).
function Shell({
  presentation,
  title,
  h1,
  onClose,
  done,
  over,
  footer,
  children,
}: {
  presentation: DraftPresentation;
  title: string;
  h1?: string;
  onClose: () => void;
  done: DrawerDone | null;
  over?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  if (presentation === 'saved') {
    return (
      <SavedShell h1={h1} over={over} footer={footer}>
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
        {...(over ? { over } : {})}
        {...(footer ? { footer } : {})}
        testId="draft-look"
      >
        {h1 ? <h1 className="sr-only">{h1}</h1> : null}
        {children}
      </Drawer>
    );
  }
  return (
    <PageShell title={title} h1={h1} onClose={onClose} done={done} over={over}>
      {children}
      {footer ? <div className="px-5 pt-5">{footer}</div> : null}
    </PageShell>
  );
}

// A saved look's own page (3e): no header, the back disc rides the photo; the body runs to the
// look's one bar, held at the foot (Schedule look, or Update look while a change waits) above the
// tab bar on a phone.
function SavedShell({
  h1,
  over,
  footer,
  children,
}: {
  h1?: string;
  over?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  // The page's back pill stands down: the disc on the photo is the way back.
  useHideBack(true);
  return (
    <article
      className="relative -mx-4 flex flex-col pb-40 md:mx-auto md:w-full md:max-w-md"
      data-testid="saved-look"
    >
      {h1 ? <h1 className="sr-only">{h1}</h1> : null}
      {children}
      {footer ? <LookBar>{footer}</LookBar> : null}
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

// The saved look's bar at the foot; toasts rise above it, so an Undo never covers Update look.
function LookBar({ children }: { children: ReactNode }) {
  const bar = useRef<HTMLDivElement>(null);
  useToastLiftOver(bar);
  return (
    <div
      ref={bar}
      className="fixed inset-x-0 bottom-0 z-30 border-hairline border-t-[0.5px] bg-bg pb-[max(1.375rem,env(safe-area-inset-bottom))]"
      data-testid="look-bar"
    >
      <div className="mx-auto flex w-full max-w-md items-center px-5 pt-3">{children}</div>
    </div>
  );
}

function PageShell({
  title,
  h1,
  onClose,
  done,
  over,
  children,
}: {
  title: string;
  h1?: string;
  onClose: () => void;
  done: DrawerDone | null;
  over?: ReactNode;
  children: ReactNode;
}) {
  // A pushed view on a phone: the back pill alone, no masthead and no dock.
  usePushedView();
  return (
    <article
      className="relative mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-t-sheet border-[0.5px] border-rule-mid bg-bg md:rounded-sheet"
      data-testid="draft-look"
    >
      {h1 ? <h1 className="sr-only">{h1}</h1> : null}
      <DrawerHeader title={title} onClose={onClose} closeLabel={copy.close} done={done} />
      <div className="relative">
        <div className="pb-8">{children}</div>
        {over}
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
  onCreated: (look: Look) => void;
}) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const refresh = useRefreshLooks();
  const model = useApi('me.model.get');
  const summary = useApi('wardrobe.summary');
  const owned = summary.data?.total ?? null;
  const hasWardrobe = owned !== null && owned > 0;
  const shop = useShop(owned);
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
  // Words for a day make ONE draft for it (plan 2026-11-03), dressed in the job; the drawer
  // carries on with it once the diary shows it. Without a day they deal suggestions (the deck).
  const [weatherOff, setWeatherOff] = useState(false);
  const [waiting, setWaiting] = useState(false);
  // The job behind Generate: if it ends without the day's draft, the wait ends with a word.
  const [promptJob, setPromptJob] = useState<string | null>(null);
  const followed = useJob(promptJob);
  const ended =
    followed.job && isTerminalJobStatus(followed.job.status) ? followed.job.status : null;
  useEffect(() => {
    if (!ended || ended === 'succeeded' || ended === 'partial') return;
    setPromptJob(null);
    setWaiting(false);
    setBusy(false);
    toast({ message: copy.styleFailed });
  }, [ended, toast]);
  const diary = useApi('today.get', undefined, {
    enabled: waiting,
    refetchInterval: waiting ? 2_000 : false,
  });
  const dayDraft = waiting
    ? (diary.data?.diary?.days.find((x) => x.date === day)?.draft?.look ?? null)
    : null;
  useEffect(() => {
    if (!dayDraft) return;
    setWaiting(false);
    onCreated(dayDraft);
  });
  const generate = async () => {
    const words = prompt.trim();
    if (words.length < 2 || busy) return;
    setBusy(true);
    try {
      if (day) {
        const place = diary.data?.diary?.days.find((x) => x.date === day)?.place ?? null;
        const { jobId } = await api.call('looks.prompt', {
          input: {
            prompt: words,
            date: day,
            draft: true,
            balance: shop.balance,
            ...(place && !weatherOff ? { place } : {}),
            ...(weatherOff ? { weather: false } : {}),
          },
        });
        setPromptJob(jobId);
        setWaiting(true);
        return;
      }
      const { jobId } = await api.call('looks.prompt', {
        input: { prompt: words, balance: shop.balance },
      });
      router.replace(`/looks/style/${jobId}`);
    } catch (err) {
      setBusy(false);
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
      footer={
        <Button
          variant="primary"
          block
          onClick={() => void generate()}
          disabled={prompt.trim().length < 2 || busy}
          data-testid="draft-generate"
        >
          {copy.generate}
          <Icon name="check" size={12} />
        </Button>
      }
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
        <StylingCard
          {...(day
            ? {
                context: (
                  <DayContext date={day} weatherOff={weatherOff} onWeatherOff={setWeatherOff} />
                ),
              }
            : {})}
          shop={shop.on}
          onShop={shop.set}
          placeholders={copy.placeholders}
          value={prompt}
          onChange={setPrompt}
          onSend={() => void generate()}
          busy={busy}
        />
      </div>
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
  schedule,
  presentation,
  onClose,
}: {
  look: Look;
  forDay: string | null;
  images?: 'add';
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
  const shop = useShop(owned);
  const [rackLayout, setRackLayout] = useState<WardrobeLayout>('list');
  const [editingPieces, setEditingPieces] = useState(false);
  const [adding, setAdding] = useState(false);
  const [weatherOff, setWeatherOff] = useState(false);
  const askContext = useAskContext(forDay, weatherOff);
  const adjustRef = useRef<Adjust | null>(null);
  const editor = useLookEditor(look, { onChange: () => adjustRef.current?.changed() });
  const adjust = useAdjust(look, editor, mode === 'edit' ? 'saved' : 'draft');
  adjustRef.current = adjust;
  useDressOnOpen(look);
  const save = useSaveLook((saved) => {
    // Saved from home's day: that day shows it as the day's card. Else the saved look opens
    // with the diary up, so it can be scheduled in the same breath.
    if (forDay) router.replace(`/?day=${forDay}&saved=${saved.id}`);
    else router.replace(`/look/${saved.id}?schedule=1`);
  });
  const update = useApiMutation('looks.update', {
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.call('looks.get', { params: { id: look.id } }), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [sheet, setSheet] = useState<DraftSheet | null>(null);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [subview, setSubview] = useState<'tags' | 'seasons' | 'worn' | null>(null);
  const [diary, setDiary] = useState(schedule);
  // `?schedule=1` opened the diary once; the address drops it so Back never re-opens it.
  useEffect(() => {
    if (schedule) window.history.replaceState(null, '', `/look/${look.id}`);
  }, [schedule, look.id]);
  // Image mode (D19): opened from Home's + it starts on Add a photo.
  const [managing, setManaging] = useState(images === 'add');
  const stack = useImageStage(look);
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null);
  const [prompt, setPrompt] = useState('');
  const rows = editor.rack.rows;
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const imageOf = (row: RackRow) => (row.pieceId ? piecesById.get(row.pieceId)?.image : null);
  const sendOpts = {
    balance: shop.balance,
    ...(askContext ? { context: askContext } : {}),
  };
  // A photograph filed from the picker lands where the picker was opened.
  const photo = usePhotoFiling();
  const snapFor = useRef<PickerMode>({ add: true });
  const filed = photo.filing.phase === 'filed' ? photo.filing.piece : null;
  useEffect(() => {
    if (!filed) return;
    photo.reset();
    if ('swap' in snapFor.current) editor.swap(snapFor.current.swap.key, filed);
    else editor.add(filed);
  });
  const reading = photo.filing.phase === 'uploading' || photo.filing.phase === 'reading';
  const busy = adjust.busy || save.isPending || editor.saving || stack.committing;
  const words = prompt.trim();
  // A saved look's edit: anything not yet applied with Update look (D17, D18, D20).
  const pending =
    mode === 'edit' &&
    (editor.dirty || adjust.stale || words.length > 0 || stack.changed || shop.changed);
  const canDone =
    mode === 'draft' ? (rows.length > 0 || look.image !== null) && !busy : !pending && !busy;
  // Update look: the rack written, then the picture drawn for it. Words still in the field go
  // through the thread first; the write waits for their answer to land on the rack.
  const [applying, setApplying] = useState<'asked' | 'reading' | null>(null);
  // Her photographs and the cover first, then the rack and a redraw for changed pieces. The
  // cover she chose stays in front; a hidden Robes' picture comes back as the cover (D19).
  const commit = async () => {
    if (!(await stack.commit())) return;
    if (editor.dirty) {
      if (!(await editor.update())) return;
    } else toast({ message: lookbook.updated });
    shop.settle();
    adjust.drawForSave();
  };
  const apply = () => {
    if (mode !== 'edit' || busy || !pending) return;
    if (words && rows.length > 0) {
      adjust.send(words, sendOpts);
      setPrompt('');
      setApplying('asked');
      return;
    }
    setPrompt('');
    void commit();
  };
  useEffect(() => {
    if (applying === 'asked' && adjust.busy) setApplying('reading');
    if (applying === 'reading' && !adjust.busy) {
      setApplying(null);
      void commit();
    }
  });
  const done = () => {
    if (!canDone) return;
    if (mode === 'draft') {
      // A draft's photographs are kept as it is saved.
      void stack.commit().then((ok) => {
        if (!ok) return;
        adjust.drawForSave();
        save.mutate({ params: { id: look.id }, input: forDay ? { date: forDay } : {} });
      });
      return;
    }
    onClose();
  };
  const close = () => {
    if (mode === 'edit' && !pending) {
      onClose();
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
    if (forDay) router.replace(`/?day=${forDay}`);
    else onClose();
  };
  const del = () => {
    setConfirm(null);
    remove(look.id);
    router.replace('/looks');
  };
  // Generate: her words go through the thread and the picture is drawn once the rack is answered.
  // With nothing typed and the picture behind, the chip draws the model instead.
  const generate = () => {
    if (busy) return;
    if (words) {
      adjust.send(words, { ...sendOpts, draw: true });
      setPrompt('');
      return;
    }
    if (adjust.stale) adjust.updateModel();
  };
  // The sticky GENERATE ✓ at the draft's foot (PRD §4.6): her words, or the model drawn again
  // while the picture is behind. A saved look's words wait for Update look (D17) instead.
  const generateFoot =
    mode === 'edit'
      ? null
      : words
        ? { label: copy.generate, disabled: busy, refresh: false }
        : adjust.stale
          ? { label: d.updateModel(adjust.badge), disabled: busy, refresh: true }
          : { label: copy.generate, disabled: true, refresh: false };
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
            title: mode === 'edit' ? copy.discardEdit.title : copy.discard.title,
            message: mode === 'edit' ? copy.discardEdit.body : copy.discard.body,
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
  return (
    <Shell
      presentation={presentation}
      title={mode === 'edit' ? copy.editTitle : copy.title}
      h1={look.name}
      onClose={close}
      done={{
        label: mode === 'edit' ? copy.doneEdit : copy.done,
        ...(forDay ? { hint: copy.doneForDay } : {}),
        onClick: done,
        disabled: !canDone,
        testId: 'draft-done',
      }}
      footer={
        // A saved look's one button (PRD rev 3 §6.1): Schedule look at rest, Update look while a
        // change waits — never both. Native twin: DraftLook.tsx's footer.
        presentation === 'saved' && !pending ? (
          <Button
            variant="primary"
            block
            onClick={() => setDiary(true)}
            data-testid="schedule-look"
          >
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
        ) : generateFoot ? (
          <Button
            variant="primary"
            block
            onClick={generate}
            aria-disabled={generateFoot.disabled}
            className={generateFoot.disabled ? 'opacity-40' : undefined}
            data-testid="draft-generate"
          >
            {generateFoot.label}
            {generateFoot.refresh ? (
              <Icon name="undo" size={12} className="-scale-x-100" />
            ) : (
              <Icon name="check" size={12} />
            )}
          </Button>
        ) : undefined
      }
      over={
        <>
          <AdjustSheet
            open={sheet === 'adjust'}
            sending={adjust.busy}
            // Adjust model image (D21): the picture alone, never the pieces.
            onSend={(text) => {
              adjust.picture(text);
              setSheet(null);
            }}
            onClose={() => setSheet(null)}
          />
          <DescribeSheet
            open={sheet === 'describe'}
            pieces={rows
              .filter((r) => r.pieceId)
              .map((r) => ({
                key: r.key,
                name: r.name,
                image: r.pieceId ? piecesById.get(r.pieceId)?.image : null,
              }))}
            sending={adjust.busy}
            onRemovePiece={(key) => editor.remove(key)}
            onSend={(text) => {
              adjust.describe(text);
              setSheet(null);
            }}
            onClose={() => setSheet(null)}
          />
        </>
      }
    >
      {managing ? (
        <ImageManager
          look={look}
          stage={stack.stage}
          onStage={stack.update}
          onDone={() => setManaging(false)}
          focusAdd={images === 'add'}
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
          onAdjust={() => setSheet('adjust')}
          onImages={() => setManaging(true)}
          onRetry={adjust.updateModel}
          stage={stack.stage}
          {...(presentation === 'saved' ? { onBack: close } : {})}
        />
      )}
      <div className="flex flex-col gap-3 px-5 pt-3">
        <Tabs items={TABS} value={tab} onChange={setTab} label={lookbook.savedLook.tabs.pieces} />
        {tab === TABS[0] ? (
          <div className="flex flex-col gap-3" data-testid="pieces-tab">
            <Rack
              rows={rows}
              imageOf={imageOf}
              layout={rackLayout}
              onLayout={setRackLayout}
              editing={editingPieces}
              onEditing={setEditingPieces}
              saved={mode === 'edit'}
              hasWardrobe={hasWardrobe}
              onAdd={() => (hasWardrobe ? setPicker({ add: true }) : setAdding(true))}
            >
              {rows.map((row) => (
                <RackRowCard
                  key={row.key}
                  row={row}
                  image={imageOf(row)}
                  mark={editor.mark(row.key)}
                  styled={editor.rack.styling[row.key]}
                  {...(mode === 'edit' && row.pieceId
                    ? { wears: piecesById.get(row.pieceId)?.wearCount ?? 0 }
                    : {})}
                  {...(row.proposal && editingPieces ? { onWish: () => editor.wish(row.key) } : {})}
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
              ))}
            </Rack>
            <StylingCard
              {...(forDay
                ? {
                    context: (
                      <DayContext
                        date={forDay}
                        weatherOff={weatherOff}
                        onWeatherOff={setWeatherOff}
                      />
                    ),
                  }
                : {})}
              shop={shop.on}
              onShop={shop.set}
              thread={<ThreadLines thread={adjust.state.thread} />}
              {...(mode === 'edit'
                ? { placeholder: copy.editPlaceholder }
                : { placeholders: copy.placeholders })}
              value={prompt}
              onChange={setPrompt}
              onSend={mode === 'edit' ? apply : generate}
              {...(adjust.canRedress
                ? { onDescribe: () => setSheet('describe'), describeLabel: d.redress }
                : {})}
              busy={busy}
            />
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
      <PiecePicker
        mode={picker}
        onRack={onRackIds(rows)}
        onClose={() => setPicker(null)}
        onPick={(pieces, wishes) => {
          if (!picker) return;
          if ('swap' in picker) {
            const [piece] = pieces;
            if (piece) editor.swap(picker.swap.key, piece);
            return;
          }
          for (const piece of pieces) editor.add(piece);
          for (const wish of wishes) editor.addWish(wish);
        }}
        onSnap={(file) => {
          if (picker) snapFor.current = picker;
          void photo.file(file);
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
// behind) until she asks; scanned while it is drawn; the adjust disc bottom-left opens the
// AdjustSheet and the image stack bottom-right the ImageManager.
function DraftPhoto({
  look,
  model,
  modelPending,
  stale,
  redressing,
  chip,
  pronoun,
  onAdjust,
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
  onAdjust: () => void;
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
  const stand = model?.stand?.imageUrl ?? (model?.filed ? model.cell.imageUrl : null);
  const drawing = look.framePending || look.onModel === 'pending' || redressing;
  const line = useDressingLine(
    look.pieces.length || look.setId ? d.linesAgain : d.linesFirst,
    drawing,
  );
  const failed = !drawing && look.onModel === 'failed' && !own;
  // Adjust model image is for Robes' picture alone (PRD §6.4): never on a photograph of hers.
  const robesFront = staged ? staged.kind === 'robes' : !own;
  const glass =
    "absolute z-10 flex items-center justify-center rounded-pill bg-veil-soft text-ink backdrop-blur-[8px] after:absolute after:-inset-2.5 after:content-['']";
  return (
    <div className="relative overflow-hidden bg-surface-sunk" data-testid="draft-photo">
      <div
        className={`transition-[opacity,filter] duration-500 ${stale && !drawing ? 'opacity-80 grayscale-[.75]' : ''} ${drawing ? 'opacity-60' : ''}`}
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
        ) : rendered ? (
          <LookImage look={rendered} priority sizes="(min-width: 448px) 448px, 100vw" />
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
      {robesFront ? (
        <button
          type="button"
          onClick={onAdjust}
          aria-label={lookbook.savedLook.adjust}
          title={lookbook.savedLook.adjust}
          data-testid="draft-adjust"
          className={`${glass} ${focus} bottom-[25px] left-5 size-6`}
        >
          <Icon name="describe" size={13} />
        </button>
      ) : null}
      <ImageStack look={look} onOpen={onImages} />
    </div>
  );
}
