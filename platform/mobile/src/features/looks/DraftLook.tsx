import { useApi, useApiClient } from '@robes/api-client/react';
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
import {
  type Balance,
  defaultSources,
  type ImageStage,
  isCaptureRow,
  type RackRow,
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
import { Icon } from '@robes/icons/native';
import {
  AlertDialog,
  type AlertDialogAction,
  Button,
  DrawerHeader,
  EmptyState,
  FINE_EDGE,
  fonts,
  Image,
  MIN_TOUCH,
  PrimaryScope,
  Sheet,
  Skeleton,
  Tabs,
  Text,
  useColor,
  useToast,
  useToastLift,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { type HostInstance, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBareScreen } from '@/components/StackScreen';
import { pickOne, usePhotoFiling } from '@/features/home/file-photo';
import { AddPiecesSheet } from '@/features/wardrobe/add/AddPiecesSheet';
import { LayoutToggle } from '@/features/wardrobe/WardrobeHeader';
import { nativeAnalytics } from '@/lib/analytics';
import { useArrived, useLeaveSheetFor } from '@/lib/arrival';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { useKeyboardOverlap } from '@/lib/keyboard';
import { Feedback, FeedbackTokens, ThreadLines, Thumbs } from './AdjustDock';
import { type Adjust, useAdjust } from './adjust';
import { CapturePieces, CaptureRow, NewPieceSheet, RemovedLine } from './CaptureRack';
import { useCaptureRack } from './capture-rack';
import { DayContext, DayMeta } from './DayContext';
import { DiarySheet } from './DiarySheet';
import { AdjustSheet } from './DraftSheets';
import { CardPicture, ImageManager } from './ImageManager';
import { LookDetails } from './LookDetails';
import { LookPicture } from './LookPicture';
import { onRackIds, useLookEditor } from './look-editor';
import { useImageStage } from './look-images';
import {
  isDraftsFull,
  useInvalidateLooks,
  useJobResult,
  useLetGo,
  useSaveLook,
} from './look-states';
import { PieceList } from './PieceList';
import { type PickerMode, PiecePicker } from './PiecePicker';
import { RackCard } from './RackCard';
import { RackGrid } from './RackGrid';
import { RackRowCard } from './RackRow';
import { ImageStack, useDressOnOpen } from './SavedLook';
import { Scanning } from './ScanLine';
import { SeasonsView } from './SeasonsView';
import { type DockState, PromptDock, StylingCard } from './StylingCard';
import { useRemoveLook } from './saved-looks';
import { TagsView, useLookDetails } from './TagsView';
import { WornView } from './WornView';

const copy = lookbook.draftLook;
const d = lookbook.draft;
// How long "Look updated." stands (Capture PRD 3.5).
const UPDATED_MS = 2600;
const TABS = [lookbook.savedLook.tabs.pieces, lookbook.savedLook.tabs.details] as const;
type Tab = (typeof TABS)[number];

// `sheet` over the screen that opened it; `page` on a deep link; `saved` is a saved look's own
// page (Felix 3e: the back disc on the photo, Schedule look at the foot — Update look in its place
// while a change waits, PRD §6.1; D17).
export type DraftPresentation = 'sheet' | 'page' | 'saved';
export type DraftSheet = 'adjust';

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

// A photograph from the picker's "Photograph one": the camera, then the piece it is filed as.
function useSnap(onFiled: (piece: Piece) => void) {
  const photo = usePhotoFiling();
  const filed = photo.filing.phase === 'filed' ? photo.filing.piece : null;
  const done = useRef(onFiled);
  done.current = onFiled;
  useEffect(() => {
    if (!filed) return;
    photo.reset();
    done.current(filed);
  });
  return {
    reading: photo.filing.phase === 'uploading' || photo.filing.phase === 'reading',
    snap: async () => {
      const picked = await pickOne('camera');
      if (picked && picked !== 'denied') void photo.file(picked);
    },
  };
}

// The prompt's two sources (look prompt PRD S1–S6): her wardrobe alone once she has one, Shop
// alone while it is empty, until she says otherwise. The choice lasts for this look's thread and
// is never stored. `owned` is null while the wardrobe's count loads.
function useSources(owned: number | null): {
  sources: Sources;
  // She owns nothing: Wardrobe is faded, and a tap on it opens "Your wardrobe is empty" (S3).
  empty: boolean;
  toggle: (which: Source) => void;
  balance: Balance;
  // Changed since the look was last applied (a saved look's Update, PRD §6.1).
  changed: boolean;
  settle: () => void;
} {
  const [chosen, setChosen] = useState<Sources | null>(null);
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

// A tap on Wardrobe while she owns nothing (S3): one line and the way in.
function EmptyWardrobeSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={copy.emptyWardrobe.title}
      closeButton
      testID="empty-wardrobe"
    >
      <PrimaryScope>
        <Button
          onPress={() => {
            onClose();
            onAdd();
          }}
          testID="empty-wardrobe-add"
        >
          {copy.emptyWardrobe.add}
        </Button>
      </PrimaryScope>
    </Sheet>
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
  onOpen,
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
  onOpen?: (row: RackRow) => void;
  // The rows, as RackRowCards.
  children: ReactNode;
}) {
  const ink = useColor('ink');
  const onInk = useColor('bg');
  if (rows.length === 0) return <RackCard hasWardrobe={hasWardrobe} onPress={onAdd} />;
  return (
    <View className="gap-2.5" testID="the-rack">
      <View className="h-11 flex-row items-center justify-between gap-3">
        {/* The canvas's heading (PRD §6.1): "The Rack" in the serif, warm and quiet. */}
        <Text
          accessibilityRole="header"
          className="flex-1 text-ink-faint"
          style={{ fontFamily: fonts.displayRegular, fontSize: 17, letterSpacing: 0.16 }}
        >
          {copy.rack}
        </Text>
        <LayoutToggle layout={layout} onLayout={onLayout} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.editPieces}
          accessibilityState={{ selected: editing }}
          onPress={() => onEditing(!editing)}
          testID="rack-pencil"
          className={`items-center justify-center rounded-pill border ${
            editing ? 'border-ink bg-ink' : 'border-rule-mid bg-surface-raised'
          }`}
          style={{ width: MIN_TOUCH, height: MIN_TOUCH }}
        >
          <Icon name="pencil" size={16} color={editing ? onInk : ink} />
        </Pressable>
      </View>
      {layout === 'grid' ? (
        <>
          <RackGrid rows={rows} imageOf={imageOf} {...(onOpen ? { onOpen } : {})} />
          {saved ? <PieceList onAdd={onAdd}>{null}</PieceList> : null}
        </>
      ) : (
        <PieceList {...(saved ? { onAdd } : {})}>{children}</PieceList>
      )}
      {saved ? null : <RackCard hasWardrobe={hasWardrobe} onPress={onAdd} testID="rack-card-add" />}
    </View>
  );
}

// The draft look (Felix DraftLook; plan 2026-11-06 D14, D17, D18): ONE component for every draft
// — from Describe, built by hand, started from a piece — presented as a form sheet over whatever
// started it (app/looks/draft/[id].tsx), and for a saved look, which edits in place on its own
// page (3e) and in the Edit look sheet from Home (3k). The header carries × and the ink done disc;
// under the photo (the adjust disc, the image stack) sit Pieces · Details, the piece list with its
// add slot, and the prompt card whose Generate and the AdjustSheet's Send both feed the one thread
// (`useAdjust`) and draw the picture once it lands; a look Robes made is restyled whole from the
// thread's Restyle it all. A
// saved look's changes wait for Update look. `id` is a look, or 'new' before the first piece. Web
// twin: app/src/components/looks/draft-look.tsx.
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
  const router = useRouter();
  // Heard where the screen mounts: the look may still be loading when the screen settles.
  const arrived = useArrived();
  const [lookId, setLookId] = useState<string | null>(id === 'new' ? null : id);
  // Her words, when Robes made this draft from them just now: they head its thread.
  const [brief, setBrief] = useState<{ words: string; occasion?: string } | null>(null);
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
        onCreated={(made, from) => {
          if (from) setBrief(from);
          setLookId(made.id);
          // The draft carries on under its own address, in the same sheet.
          router.setParams({ id: made.id });
        }}
      />
    );
  }
  if (query.isError) {
    return (
      <Shell presentation={presentation} title={copy.title} onClose={onClose} done={null}>
        <EmptyState title={errorMessage(query.error)} />
      </Shell>
    );
  }
  if (!query.data) {
    return (
      <Shell presentation={presentation} title={copy.title} onClose={onClose} done={null}>
        <Skeleton width="100%" aspectRatio={4 / 5} />
      </Shell>
    );
  }
  return (
    <DraftBody
      look={query.data}
      forDay={query.data.setId ? query.data.dateHint : (day ?? null)}
      schedule={schedule === true}
      arrived={arrived}
      {...(images ? { images } : {})}
      {...(brief ? { brief } : {})}
      presentation={presentation}
      onClose={onClose}
    />
  );
}

interface Done {
  label: string;
  onPress: () => void;
  disabled: boolean;
}

// The sheet's frame: the 56pt header — × disc, tracked title, ink done disc — over a 0.5pt rule,
// the scrolling body, anything floating over it, and a footer held under the body (the Edit look
// sheet's Update look). On a page (a deep link to /look/:id) it stands bare under the status bar.
// Twin of the web Drawer in @robes/ui.
// The prompt at the look's foot (redline 14 Nov): what floats there, and — a saved look's prompt
// opened — the scrim that greys the look behind it and closes it on a tap.
interface ShellDock {
  node: ReactNode;
  onScrim?: () => void;
}

function Shell({
  presentation,
  title,
  onClose,
  done,
  over,
  footer,
  dock,
  children,
}: {
  presentation: DraftPresentation;
  title: string;
  onClose: () => void;
  done: Done | null;
  over?: ReactNode;
  footer?: ReactNode;
  dock?: ShellDock | null;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  // The prompt and Update the model ride above the keyboard, never under it.
  const root = useRef<HostInstance>(null);
  const keyboard = useKeyboardOverlap(root);
  // The look scrolls clear of the floating prompt, however tall it stands.
  const [dockHeight, setDockHeight] = useState(0);
  if (presentation === 'saved') {
    return (
      <SavedShell over={over} footer={footer} dock={dock ?? null}>
        {children}
      </SavedShell>
    );
  }
  return (
    <View
      ref={root}
      // Never flattened (FormSheetScreen.tsx): the native sheet must not reach the body's ScrollView.
      collapsable={false}
      className="flex-1 bg-bg"
      style={{ paddingTop: presentation === 'page' ? insets.top : 0, paddingBottom: keyboard }}
      testID="draft-shell"
    >
      {presentation === 'page' ? <Bare /> : null}
      <DrawerHeader
        title={title}
        onClose={onClose}
        closeLabel={copy.close}
        done={done}
        closeTestID="draft-close"
        doneTestID="draft-done"
      />
      <View collapsable={false} className="flex-1">
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingBottom: dock ? dockHeight + 16 : 40 }}
          testID="draft-look"
        >
          {children}
        </ScrollView>
        {/* The prompt floats over the look's foot with no band or rule of its own; only what is
            drawn takes a tap, and the look scrolls under it. */}
        {dock ? (
          <View
            pointerEvents="box-none"
            className="absolute inset-x-0 bottom-0"
            style={{ paddingBottom: footer || keyboard ? 0 : insets.bottom }}
            onLayout={(e) => setDockHeight(e.nativeEvent.layout.height)}
            testID="floating-dock"
          >
            {dock.node}
          </View>
        ) : null}
        {over}
      </View>
      {footer ? (
        <View
          className="border-hairline bg-bg px-5 pt-3"
          style={{
            borderTopWidth: FINE_EDGE,
            paddingBottom: keyboard ? 12 : Math.max(22, insets.bottom),
          }}
        >
          <PrimaryScope>{footer}</PrimaryScope>
        </View>
      ) : null}
    </View>
  );
}

// A saved look's own page (3e): no header, the photo starts under the status bar with the back
// disc on it; the body runs to the look's one bar, held at the foot (Schedule look). The prompt
// floats over it: closed, the sparkle or its bar just above the look's bar; opened, a sheet from
// the foot over a scrim, standing on the keyboard, and the look's bar steps away (redline 14 Nov,
// pins 23 and 25). Web twin: draft-look.tsx SavedShell.
function SavedShell({
  over,
  footer,
  dock,
  children,
}: {
  over?: ReactNode;
  footer?: ReactNode;
  dock: ShellDock | null;
  children: ReactNode;
}) {
  useBareScreen();
  const insets = useSafeAreaInsets();
  // The toast rises above the bar while it stands, so an Undo never covers Update look.
  const [bar, setBar] = useState(0);
  const sheet = dock?.onScrim;
  const barUp = footer && !sheet;
  useToastLift(barUp ? bar : 0);
  const root = useRef<HostInstance>(null);
  const keyboard = useKeyboardOverlap(root);
  return (
    <View ref={root} className="flex-1 bg-bg">
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerClassName="pb-36"
        testID="saved-look"
      >
        {children}
      </ScrollView>
      {barUp ? (
        <View
          className="absolute inset-x-0 bottom-0 flex-row items-center border-hairline bg-bg px-5 pt-3"
          style={{ borderTopWidth: FINE_EDGE, paddingBottom: keyboard ? 12 : 22, bottom: keyboard }}
          onLayout={(e) => setBar(e.nativeEvent.layout.height)}
          testID="look-bar"
        >
          <PrimaryScope>{footer}</PrimaryScope>
        </View>
      ) : null}
      {dock && !sheet ? (
        <View
          pointerEvents="box-none"
          className="absolute inset-x-0"
          style={{ bottom: barUp ? bar + keyboard : keyboard || insets.bottom }}
          testID="floating-dock"
        >
          {dock.node}
        </View>
      ) : null}
      {dock && sheet ? (
        <>
          <Pressable
            accessibilityLabel={copy.dock.minimise}
            importantForAccessibility="no"
            onPress={sheet}
            className="absolute inset-0 bg-ink"
            style={{ opacity: 0.16 }}
            testID="prompt-scrim"
          />
          <View className="absolute inset-x-0" style={{ bottom: keyboard }} testID="prompt-sheet">
            {dock.node}
            {keyboard ? null : <View className="bg-bg" style={{ height: insets.bottom }} />}
          </View>
        </>
      ) : null}
      {/* After the bar, so a floating sheet sits 8pt above everything (redline 7 Nov). */}
      {over}
    </View>
  );
}

// On a page the StackScreen stands bare: this screen draws its own header.
function Bare() {
  useBareScreen();
  return null;
}

// Before the first piece (/looks/draft/new): her model in its base layer, the add slot and the
// prompt card. The first pieces make the draft, which carries on in the same sheet; words alone
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
  // From pieces: the picker is already up when the sheet opens.
  pick?: boolean;
  presentation: DraftPresentation;
  onClose: () => void;
  // `from`: her brief, and the occasion Robes read in it, when Robes made the draft from it.
  onCreated: (look: Look, from?: { words: string; occasion?: string }) => void;
}) {
  const api = useApiClient();
  const toast = useToast();
  const refresh = useInvalidateLooks();
  const model = useApi('me.model.get');
  const summary = useApi('wardrobe.summary');
  const control = useColor('border-control');
  const owned = summary.data?.total ?? null;
  const hasWardrobe = owned !== null && owned > 0;
  const src = useSources(owned);
  const [emptyWardrobe, setEmptyWardrobe] = useState(false);
  const [picker, setPicker] = useState<PickerMode | null>(pick ? { add: true } : null);
  const [adding, setAdding] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState<{ input: CreateLookInput; oldest: string } | null>(null);

  const create = async (input: CreateLookInput) => {
    setBusy(true);
    try {
      const made = await api.call('looks.create', { input });
      refresh(made);
      onCreated(made);
    } catch (err) {
      setBusy(false);
      if (!isDraftsFull(err)) {
        toast.show({ message: errorMessage(err) });
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
  const snap = useSnap((piece) => start([piece]));
  // "Start a look with it" from a piece: the draft opens with that piece on the rack.
  const started = useRef(false);
  useEffect(() => {
    if (pieceId && !started.current) {
      started.current = true;
      void create({ status: 'draft', pieces: [{ pieceId }], anchorPieceId: pieceId });
    }
  });
  // Her words make ONE draft (plan 2026-11-03; look prompt PRD D6, D9), for the day when there is
  // one and for no day when there is not, dressed in the job; the sheet carries on with it as
  // soon as the job has made it. A prompt never deals suggestions to the deck.
  const [weatherOff, setWeatherOff] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [promptJob, setPromptJob] = useState<string | null>(null);
  // The job ended without a draft: the wait ends with a word.
  const followed = useJobResult(
    promptJob,
    useCallback(
      (job) => {
        if (job.output?.lookIds?.[0]) return;
        setPromptJob(null);
        setWaiting(false);
        setBusy(false);
        toast.show({ message: copy.styleFailed });
      },
      [toast],
    ),
  );
  const madeId = followed?.output?.lookIds?.[0] ?? null;
  const occasion = followed?.output?.occasion;
  // The draft the job made opens here, once.
  const opening = useRef(false);
  useEffect(() => {
    if (!madeId || opening.current) return;
    opening.current = true;
    void api
      .call('looks.get', { params: { id: madeId } })
      .then((made) => {
        setWaiting(false);
        refresh();
        onCreated(made, { words: prompt.trim(), ...(occasion ? { occasion } : {}) });
      })
      .catch((err) => {
        opening.current = false;
        setPromptJob(null);
        setWaiting(false);
        setBusy(false);
        toast.show({ message: errorMessage(err) });
      });
  });
  // The day's place, for the brief.
  const diary = useApi('today.get', undefined, { enabled: day !== undefined });
  const generate = async () => {
    const words = prompt.trim();
    if (words.length < 2 || busy) return;
    setBusy(true);
    const sent = (ok: boolean) =>
      nativeAnalytics.track('prompt_submitted', {
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
      sent(true);
      setPromptJob(jobId);
      setWaiting(true);
    } catch (err) {
      sent(false);
      setBusy(false);
      toast.show({ message: errorMessage(err) });
    }
  };
  const stand = model.data?.stand?.imageUrl ?? null;
  return (
    <Shell
      presentation={presentation}
      title={copy.title}
      onClose={onClose}
      done={{ label: copy.done, onPress: () => undefined, disabled: true }}
      // The prompt box floats at the foot, in thumb reach from the start (look prompt PRD F23).
      dock={{
        node: (
          <View style={{ padding: 10 }} testID="prompt-dock">
            <StylingCard
              {...(day
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
              emptySend="blur"
              busy={busy}
            />
          </View>
        ),
      }}
    >
      <View className="overflow-hidden bg-surface-sunk">
        {stand ? (
          <Image source={stand} alt={lookbook.figure.alt} />
        ) : model.isPending ? (
          <Skeleton width="100%" aspectRatio={4 / 5} />
        ) : (
          <View className="aspect-[4/5] w-full items-center justify-center bg-surface">
            <Icon name="user" size={160} color={control} />
          </View>
        )}
        {snap.reading ? <ReadingChip /> : null}
        {waiting ? <Scanning line={d.dressing} corner /> : null}
      </View>
      <View className="gap-3 px-5 pt-3">
        <Tabs items={TABS} value={TABS[0]} onChange={() => undefined} testID="draft-tabs" />
        <RackCard
          hasWardrobe={hasWardrobe}
          onPress={() => (hasWardrobe ? setPicker({ add: true }) : setAdding(true))}
        />
      </View>
      <EmptyWardrobeSheet
        open={emptyWardrobe}
        onClose={() => setEmptyWardrobe(false)}
        onAdd={() => setAdding(true)}
      />
      <PiecePicker
        mode={picker}
        onRack={[]}
        onClose={() => setPicker(null)}
        onPick={start}
        onSnap={() => void snap.snap()}
      />
      <AddPiecesSheet
        open={adding}
        onClose={() => setAdding(false)}
        onPhoto={() => void snap.snap()}
        draft
      />
      <AlertDialog
        open={full !== null}
        title={lookbook.drafts.fullTitle}
        {...(full ? { message: lookbook.drafts.fullBody(full.oldest) } : {})}
        actions={[
          {
            label: lookbook.drafts.letGo,
            variant: 'primary',
            onPress: () => {
              const input = full?.input;
              setFull(null);
              if (input) void create({ ...input, letGoOldest: true });
            },
          },
          { label: lookbook.drafts.keep, variant: 'outline', onPress: () => setFull(null) },
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
  arrived,
  presentation,
  onClose,
}: {
  look: Look;
  forDay: string | null;
  images?: 'add';
  // Her words, when Robes made this draft from them just now (the draft's first send), and the
  // occasion Robes read in them.
  brief?: { words: string; occasion?: string };
  schedule: boolean;
  // The screen has finished coming in (useArrived): no Sheet presents before it.
  arrived: boolean;
  presentation: DraftPresentation;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  // A saved look is always in edit mode (D17): its changes wait for Update look.
  const mode: 'draft' | 'edit' = look.status === 'saved' ? 'edit' : 'draft';
  const letGo = useLetGo(lookbook.discarded);
  const remove = useRemoveLook();
  const update = useLookDetails(look);
  const model = useApi('me.model.get');
  const summary = useApi('wardrobe.summary');
  const owned = summary.data?.total ?? null;
  const hasWardrobe = owned !== null && owned > 0;
  const src = useSources(owned);
  const [emptyWardrobe, setEmptyWardrobe] = useState(false);
  const [rackLayout, setRackLayout] = useState<WardrobeLayout>('list');
  const [editingPieces, setEditingPieces] = useState(false);
  const [adding, setAdding] = useState(false);
  const [weatherOff, setWeatherOff] = useState(false);
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
  useEffect(() => {
    if (opened.current) return;
    if (brief) {
      opened.current = true;
      adjust.opened(brief.words, brief.occasion);
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
  const [newPiece, setNewPiece] = useState<string | null>(null);
  useDressOnOpen(look);
  const leaveSheetFor = useLeaveSheetFor();
  const save = useSaveLook((saved) => {
    // Saved from home's day: that day shows it as the day's card. Else the saved look opens
    // with the diary up, so it can be scheduled in the same breath — the sheet gone first, so
    // the diary can rise over the page (useLeaveSheetFor).
    if (forDay) router.replace({ pathname: '/', params: { day: forDay, saved: saved.id } });
    else if (presentation === 'sheet') leaveSheetFor(`/look/${saved.id}?schedule=1`);
    else router.replace(`/look/${saved.id}?schedule=1`);
  });
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [sheet, setSheet] = useState<DraftSheet | null>(null);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [subview, setSubview] = useState<'tags' | 'seasons' | 'worn' | null>(null);
  // Asked for (`schedule`, Schedule look, Worn's Add a date), it rises once the screen is in.
  const [diaryAsked, setDiary] = useState(schedule);
  const diary = diaryAsked && arrived;
  // Image mode (D19): opened from Home's + it starts on Add a photo.
  // Image mode (D19): opened from Home's + it starts on Add a photo, and so does the Edit look
  // sheet, whose picture is the photo strip (Capture PRD 3.1).
  const stripFirst = images === 'add' || (mode === 'edit' && presentation === 'sheet');
  const [managing, setManaging] = useState(stripFirst);
  const stack = useImageStage(look);
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null);
  const [prompt, setPrompt] = useState('');
  const rows = editor.rack.rows;
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const pieceOf = (id: string) => piecesById.get(id) ?? capture.pieceOf(id);
  const imageOf = (row: RackRow) => (row.pieceId ? pieceOf(row.pieceId)?.image : null);
  // At rest a row opens its piece (PRD §6.1); a proposal has no page yet (PR 6).
  const openPiece = (row: RackRow) => {
    if (row.pieceId) router.push({ pathname: '/piece/[id]', params: { id: row.pieceId } });
  };
  const sendOpts = {
    balance: src.balance,
    ...(askContext ? { context: askContext } : {}),
  };
  // A photograph filed from the picker lands where the picker was opened.
  const snapFor = useRef<PickerMode>({ add: true });
  const snap = useSnap((piece) => {
    if ('swap' in snapFor.current) editor.swap(snapFor.current.swap.key, piece);
    else editor.add(piece);
  });
  const busy = adjust.busy || save.isPending || editor.saving || stack.committing;
  const words = prompt.trim();
  // A saved look's edit: anything not yet applied with Update look (D17, D18). Her photographs
  // and the cover are not among them: the strip's ✓ keeps them (keepStrip).
  // Words in the prompt are not among them: the prompt sends and keeps its own changes.
  const pending = mode === 'edit' && (editor.dirty || adjust.stale);
  // A look from her photograph saves at any point but while its pieces are being found (1c.10).
  const finding = capture.on && capture.stage === 'finding';
  const canDone =
    mode === 'draft'
      ? (rows.length > 0 || look.image !== null) && !busy && !finding
      : // A saved look's ✓ is Update look by another name: both wait until something changes
        // (Capture PRD 3.1, 3.5); × leaves.
        pending && !busy;
  // Update look keeps what she changed by hand: her photographs and the cover first, then the
  // rack and a redraw for changed pieces. The cover she chose stays in front; a hidden Robes'
  // picture comes back as the cover (D19).
  const commit = async () => {
    if (!(await stack.commit())) return;
    if (editor.dirty) {
      if (!(await editor.update())) return;
    } else toast.show({ message: lookbook.updated, duration: UPDATED_MS });
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
    if (forDay) router.replace({ pathname: '/', params: { day: forDay } });
    else onClose();
  };
  const del = () => {
    setConfirm(null);
    remove.mutate({ params: { id: look.id } });
    router.replace('/looks');
  };
  // The box's send (look prompt PRD P2): her words go through the thread and the picture is drawn
  // once the rack is answered.
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
  // "Update the model · N" keeps its place at the draft's foot while the picture is behind: it is
  // not a prompt send. A saved look's changes wait for Update look (D17) instead.
  const modelFoot = mode === 'draft' && !captureDraft && adjust.stale;
  const dialog: { title: string; message: string; actions: AlertDialogAction[] } | null =
    confirm === 'delete'
      ? {
          title: lookbook.savedLook.deleteTitle,
          message: lookbook.savedLook.deleteBody,
          actions: [
            { label: lookbook.savedLook.delete, variant: 'danger', onPress: del },
            { label: lookbook.savedLook.cancel, variant: 'quiet', onPress: () => setConfirm(null) },
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
              { label: copy.discard.discard, variant: 'primary', onPress: discard },
              { label: copy.discard.keep, variant: 'outline', onPress: () => setConfirm(null) },
              ...(mode === 'draft'
                ? [{ label: copy.discard.later, variant: 'quiet' as const, onPress: onClose }]
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
        styled={editor.rack.styling[row.key]}
        {...((mode === 'edit' || captureDraft) && row.pieceId
          ? { wears: pieceOf(row.pieceId)?.wearCount ?? 0 }
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
          : row.pieceId
            ? { onOpen: () => openPiece(row) }
            : {})}
      />
    ),
  );
  // The prompt floats at the look's foot (look prompt PRD F23; redline 14 Nov): open on a draft,
  // behind the sparkle on a saved look until she asks for it. Closed it is one bar with Robes'
  // question and its thumbs; a thumbs up shrinks it to the sparkle (F6), a thumbs down opens it
  // on what to change.
  const verdict = adjust.state.verdict;
  const [dockOpen, setDockOpen] = useState(mode === 'draft');
  useEffect(() => {
    if (verdict === 'up') setDockOpen(false);
    if (verdict === 'down') setDockOpen(true);
  }, [verdict]);
  const hasThread = adjust.state.thread.length > 0 || adjust.state.question !== null;
  const lastLine = adjust.state.thread.at(-1);
  const working = lastLine?.who === 'work';
  const dockState: DockState = dockOpen
    ? 'open'
    : verdict === 'ask' || working || adjust.busy || (mode === 'draft' && verdict !== 'up')
      ? 'pill'
      : 'spark';
  // Her first send carries the day's place and weather into the conversation (pin 13).
  const briefed = adjust.state.thread.some((l) => l.who === 'her');
  const dayContext = forDay && mode === 'draft' ? forDay : null;
  const asSheet = mode === 'edit' || hasThread;
  const screen = useWindowDimensions();
  const dockNode = captureDraft ? null : (
    <PromptDock
      state={dockState}
      sheet={asSheet}
      line={
        working
          ? (lastLine?.text ?? '')
          : verdict === 'down'
            ? fb.change
            : (adjust.state.question ?? copy.dock.rest)
      }
      working={working}
      thumbs={verdict === 'ask' ? <Thumbs adjust={adjust} /> : null}
      turns={adjust.state.thread.length + (adjust.state.question ? 1 : 0)}
      maxHeight={Math.round(screen.height * 0.66)}
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
            />
          </>
        ) : null
      }
      onOpen={() => setDockOpen(true)}
      onMinimise={() => setDockOpen(false)}
    >
      <StylingCard
        inline={asSheet}
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
          : mode === 'edit'
            ? { placeholder: copy.savedPlaceholder }
            : { placeholders: copy.placeholders })}
        {...(picked
          ? { emptySend: 'send' as const }
          : mode === 'draft'
            ? { emptySend: 'blur' as const }
            : {})}
        value={prompt}
        onChange={setPrompt}
        onSend={mode === 'edit' ? ask : generate}
        busy={busy}
      />
    </PromptDock>
  );
  // A saved look's prompt opened is a sheet over the greyed look, and the look's button steps
  // away: changes are made through the prompt alone (pins 23, 25).
  const promptSheet = presentation === 'saved' && dockState === 'open' && dockNode !== null;
  const dock = dockNode
    ? { node: dockNode, ...(promptSheet ? { onScrim: () => setDockOpen(false) } : {}) }
    : null;
  // While the prompt is open or keeping its change there is no button at all (pin 25).
  const noButton = mode === 'edit' && (dockState === 'open' || applying !== null);
  const footButton =
    noButton ? undefined : // A saved look's one button (PRD rev 3 §6.1): Schedule look at rest, Update look while a
    // hand edit waits — never both.
    presentation === 'saved' && !pending ? (
      <Button onPress={() => setDiary(true)} testID="schedule-look">
        {lookbook.savedLook.schedule}
      </Button>
    ) : mode === 'edit' ? (
      // The Edit look sheet's one accept (3k): she stays to see it land.
      <Button onPress={apply} disabled={!pending || busy} icon="refresh" testID="update-look">
        {copy.update}
      </Button>
    ) : modelFoot ? (
      <Button onPress={adjust.updateModel} disabled={busy} icon="refresh" testID="update-model">
        {d.updateModel(adjust.badge)}
      </Button>
    ) : undefined;
  return (
    <Shell
      presentation={presentation}
      title={mode === 'edit' ? copy.editTitle : copy.title}
      onClose={close}
      done={{
        label: mode === 'edit' ? copy.doneEdit : copy.done,
        onPress: done,
        disabled: !canDone,
      }}
      {...(footButton ? { footer: footButton } : {})}
      dock={dock}
      over={
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
      }
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
          chip={snap.reading ? lookbook.figure.reading : null}
          pronoun={pronoun(model.data)}
          onAdjust={() => setSheet('adjust')}
          onImages={() => setManaging(true)}
          onRetry={adjust.updateModel}
          stage={stack.stage}
          {...(presentation === 'saved' ? { onBack: close } : {})}
        />
      )}
      <View className="gap-3 px-5 pt-3">
        <Tabs items={TABS} value={tab} onChange={setTab} testID="draft-tabs" />
        {tab === TABS[0] ? (
          <View className="gap-3" testID="pieces-tab">
            {capture.on && (captureDraft || capture.stage !== 'rack') ? (
              <CapturePieces look={look} capture={capture}>
                {rackRows}
              </CapturePieces>
            ) : (
              <>
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
                  onOpen={openPiece}
                >
                  {rackRows}
                </Rack>
                <RemovedLine capture={capture} />
              </>
            )}
          </View>
        ) : (
          <View className="gap-3">
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
              // Delete (D9), asked first. Felix keeps both reds off text: the link is ink-soft and
              // underlined, and danger fills only the confirm's Delete (redline 7 Nov).
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirm('delete')}
                className="min-h-11 justify-center self-start"
                testID="delete-look"
              >
                <Text size="small" tone="muted" style={{ textDecorationLine: 'underline' }}>
                  {copy.delete}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
      <EmptyWardrobeSheet
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
            if (piece) editor.swap(picker.swap.key, piece);
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
        onSnap={() => {
          if (picker && !('match' in picker)) snapFor.current = picker;
          void snap.snap();
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
        onPhoto={() => {
          snapFor.current = { add: true };
          void snap.snap();
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
        open={dialog !== null}
        title={dialog?.title ?? ''}
        {...(dialog ? { message: dialog.message } : {})}
        actions={dialog?.actions ?? []}
        onDismiss={() => setConfirm(null)}
        testID="draft-confirm"
      />
    </Shell>
  );
}

function ReadingChip() {
  return (
    <View pointerEvents="none" className="absolute inset-x-0 items-center" style={{ top: '44%' }}>
      <View accessibilityLiveRegion="polite" className="rounded-pill bg-bg px-4 py-2">
        <Text size="caption" className="uppercase tracking-widest">
          {lookbook.figure.reading}
        </Text>
      </View>
    </View>
  );
}

// The picture: Robes' frame or her model wearing the rack — the model's base layer before
// anything is drawn — full-bleed at 4:5 on `cream-100`. Stale (dimmed, with the count it is
// behind) until she asks; scanned while it is drawn; the adjust disc bottom-left opens the
// AdjustSheet and the image stack bottom-right the ImageManager. On the saved look's page (3e) it
// starts under the status bar with the back disc top-left.
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
  onBack,
  stage,
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
  // "Couldn't dress her · Try again": draws the picture once more.
  onRetry: () => void;
  onBack?: () => void;
  // What she has done in image mode and not yet applied: its front card shows here.
  stage: ImageStage;
}) {
  const { width } = useWindowDimensions();
  const base = lookStack(look);
  const staged = stageChanged(base, stage) ? stageFront(base, stage) : null;
  const control = useColor('border-control');
  const ink = useColor('ink');
  const insets = useSafeAreaInsets();
  // Under the status bar on the saved look's page; under the sheet's header elsewhere.
  const top = (onBack ? insets.top : 0) + 12;
  const own = look.photo !== null && look.record === 'photo';
  const image = own
    ? look.image
    : (look.image ?? (look.model?.status === 'ready' ? look.model : null));
  // The last picture drawn stays up, dimmed, while the rack has moved on and the next is drawn
  // (redline 14 Nov): the look never falls back to the bare model between two pictures.
  const last = useRef<{ id: string; image: NonNullable<typeof image> } | null>(null);
  if (image) last.current = { id: look.id, image };
  const held = !image && !own && last.current?.id === look.id ? last.current.image : null;
  const shown = image ?? held;
  const uri = renditionUri(shown, 720);
  const stand = model?.stand?.imageUrl ?? (model?.filed ? model.cell.imageUrl : null);
  const drawing = look.framePending || look.onModel === 'pending' || redressing;
  const line = useDressingLine(
    look.pieces.length || look.setId ? d.linesAgain : d.linesFirst,
    drawing,
  );
  const failed = !drawing && look.onModel === 'failed' && !own;
  // Adjust model image is for Robes' picture alone (PRD §6.4): never on a photograph of hers.
  const robesFront = staged ? staged.kind === 'robes' : !own;
  return (
    <View className="overflow-hidden bg-surface-sunk" testID="draft-photo">
      <View
        style={{ opacity: drawing ? 0.6 : stale || held ? 0.8 : 1 }}
        testID={stale && !drawing ? 'draft-picture-stale' : 'draft-picture'}
      >
        {staged ? (
          <CardPicture
            look={look}
            card={staged}
            alt={staged.kind === 'robes' ? lookbook.savedLook.manager.robes : look.name}
            width={width}
          />
        ) : look.frame && !own ? (
          <LookPicture look={look} />
        ) : uri ? (
          <Image source={uri} alt={looksCopy.page.imageAlt(look.name)} blurhash={shown?.blurhash} />
        ) : stand ? (
          <Image source={stand} alt={lookbook.figure.alt} />
        ) : modelPending ? (
          <Skeleton width="100%" aspectRatio={4 / 5} />
        ) : (
          <View className="aspect-[4/5] w-full items-center justify-center bg-surface">
            <Icon name="user" size={160} color={control} />
          </View>
        )}
      </View>
      {drawing ? <Scanning line={line || d.dressing} corner /> : null}
      {chip ? (
        <View
          pointerEvents="none"
          className="absolute inset-x-0 items-center"
          style={{ top: '44%' }}
        >
          <View accessibilityLiveRegion="polite" className="rounded-pill bg-bg px-4 py-2">
            <Text size="caption" className="uppercase tracking-widest">
              {chip}
            </Text>
          </View>
        </View>
      ) : null}
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={lookbook.savedLook.back}
          onPress={onBack}
          hitSlop={10}
          testID="saved-look-back"
          className="absolute items-center justify-center rounded-pill bg-veil-soft"
          style={{ top: top - 2, left: 12, width: 36, height: 36 }}
        >
          <Icon name="back" size={20} color={ink} />
        </Pressable>
      ) : null}
      {failed ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="absolute right-3 min-h-11 justify-center rounded-pill border border-hairline bg-bg px-3"
          style={{ top }}
        >
          <Text size="caption" accessibilityLiveRegion="polite">
            {lookbook.figure.undressed(pronoun)}
          </Text>
        </Pressable>
      ) : null}
      {robesFront ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={lookbook.savedLook.adjust}
          onPress={onAdjust}
          hitSlop={10}
          testID="draft-adjust"
          className="absolute items-center justify-center rounded-pill bg-veil-soft"
          style={{ left: 20, bottom: 25, width: 24, height: 24 }}
        >
          <Icon name="describe" size={13} color={ink} />
        </Pressable>
      ) : null}
      <ImageStack look={look} onOpen={onImages} />
    </View>
  );
}
