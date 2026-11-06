import { useApi, useApiClient } from '@robes/api-client/react';
import type { CreateLookInput, DiaryDay, Look, Model, Piece } from '@robes/contracts';
import { lookbook, looks as looksCopy } from '@robes/copy';
import { readsAsThey } from '@robes/core/avatar';
import { shortRange, weatherIcon } from '@robes/core/weather';
import { Icon } from '@robes/icons/native';
import {
  AlertDialog,
  type AlertDialogAction,
  Button,
  EmptyState,
  FINE_EDGE,
  Image,
  MIN_TOUCH,
  maxFontSizeMultiplier,
  PrimaryScope,
  Skeleton,
  Tabs,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBareScreen } from '@/components/StackScreen';
import { pickOne, usePhotoFiling } from '@/features/home/file-photo';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { ThreadLines } from './AdjustDock';
import { type Adjust, useAdjust } from './adjust';
import { DiarySheet } from './DiarySheet';
import { AdjustSheet, DescribeSheet, SheetField } from './DraftSheets';
import { ImageManager } from './ImageManager';
import { LookDetails } from './LookDetails';
import { LookPicture } from './LookPicture';
import { useLookEditor } from './look-editor';
import { isDraftsFull, useInvalidateLooks, useLetGo, useSaveLook } from './look-states';
import { PieceList } from './PieceList';
import { type PickerMode, PiecePicker } from './PiecePicker';
import { RackRowCard } from './RackRow';
import { ImageStack, useDressOnOpen } from './SavedLook';
import { Scanning } from './ScanLine';
import { SeasonsView } from './SeasonsView';
import { useRemoveLook } from './saved-looks';
import { TagsView, useLookDetails } from './TagsView';
import { WornView } from './WornView';

const copy = lookbook.draftLook;
const d = lookbook.draft;
const TABS = [lookbook.savedLook.tabs.pieces, lookbook.savedLook.tabs.details] as const;
type Tab = (typeof TABS)[number];

// `sheet` over the screen that opened it; `page` on a deep link; `saved` is a saved look's own
// page (Felix 3e: the back disc on the photo, Schedule look at the foot; D17).
export type DraftPresentation = 'sheet' | 'page' | 'saved';
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

// The draft look (Felix DraftLook; plan 2026-11-06 D14, D17, D18): ONE component for every draft
// — from Describe, built by hand, started from a piece — presented as a form sheet over whatever
// started it (app/looks/draft/[id].tsx), and for a saved look, which edits in place on its own
// page (3e) and in the Edit look sheet from Home (3k). The header carries × and the ink done disc;
// under the photo (the adjust disc, the image stack) sit Pieces · Details, the piece list with its
// add slot, and the prompt card whose Generate and the AdjustSheet's Send both feed the one thread
// (`useAdjust`) and draw the picture once it lands; "Dress it again" opens the DescribeSheet. A
// saved look's changes wait for Update look. `id` is a look, or 'new' before the first piece. Web
// twin: app/src/components/looks/draft-look.tsx.
export function DraftLook({
  id,
  pieceId,
  day,
  schedule,
  presentation,
  onClose,
}: {
  id: string;
  pieceId?: string;
  // The day the draft is for (home's door): Save pins it there; Discard goes back to that day.
  day?: string;
  // A saved look opened with the diary up (a draft just saved, `?schedule=1`).
  schedule?: boolean;
  presentation: DraftPresentation;
  onClose: () => void;
}) {
  const router = useRouter();
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
        presentation={presentation}
        onClose={onClose}
        onCreated={(made) => {
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
function Shell({
  presentation,
  title,
  onClose,
  done,
  over,
  footer,
  children,
}: {
  presentation: DraftPresentation;
  title: string;
  onClose: () => void;
  done: Done | null;
  over?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const muted = useColor('ink-muted');
  const onInk = useColor('bg');
  if (presentation === 'saved') {
    return (
      <SavedShell over={over} footer={footer}>
        {children}
      </SavedShell>
    );
  }
  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: presentation === 'page' ? insets.top : 0 }}>
      {presentation === 'page' ? <Bare /> : null}
      <View
        className="h-14 flex-row items-center justify-between border-hairline px-3"
        style={{ borderBottomWidth: FINE_EDGE }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.close}
          onPress={onClose}
          hitSlop={6}
          className="items-center justify-center rounded-pill bg-surface-sunk"
          style={{ width: 36, height: 36 }}
          testID="draft-close"
        >
          <Icon name="close" size={14} color={muted} />
        </Pressable>
        <Text
          accessibilityRole="header"
          size="caption"
          numberOfLines={1}
          className="flex-1 text-center uppercase text-ink-muted"
        >
          {title}
        </Text>
        {done ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={done.label}
            accessibilityState={{ disabled: done.disabled }}
            onPress={done.onPress}
            hitSlop={6}
            className="items-center justify-center rounded-pill bg-ink"
            style={{ width: 36, height: 36, opacity: done.disabled ? 0.35 : 1 }}
            testID="draft-done"
          >
            <Icon name="check" size={15} color={onInk} />
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>
      <View className="flex-1">
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerClassName="pb-10"
          testID="draft-look"
        >
          {children}
        </ScrollView>
        {over}
      </View>
      {footer ? (
        <View
          className="border-hairline bg-bg px-5 pt-3"
          style={{ borderTopWidth: FINE_EDGE, paddingBottom: Math.max(22, insets.bottom) }}
        >
          <PrimaryScope>{footer}</PrimaryScope>
        </View>
      ) : null}
    </View>
  );
}

// A saved look's own page (3e): no header, the photo starts under the status bar with the back
// disc on it; the body runs to the look's one bar, held at the foot (Schedule look). Web twin:
// draft-look.tsx SavedShell.
function SavedShell({
  over,
  footer,
  children,
}: {
  over?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useBareScreen();
  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerClassName="pb-36"
        testID="saved-look"
      >
        {children}
      </ScrollView>
      {over}
      {footer ? (
        <View
          className="absolute inset-x-0 bottom-0 flex-row items-center border-hairline bg-bg px-5 pt-3"
          style={{ borderTopWidth: FINE_EDGE, paddingBottom: 22 }}
          testID="look-bar"
        >
          <PrimaryScope>{footer}</PrimaryScope>
        </View>
      ) : null}
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
  presentation,
  onClose,
  onCreated,
}: {
  pieceId?: string;
  presentation: DraftPresentation;
  onClose: () => void;
  onCreated: (look: Look) => void;
}) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const refresh = useInvalidateLooks();
  const model = useApi('me.model.get');
  const control = useColor('border-control');
  const [picker, setPicker] = useState<PickerMode | null>(null);
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
  const start = (pieces: Piece[]) =>
    void create({ status: 'draft', pieces: pieces.map((p) => ({ pieceId: p.id })) });
  const snap = useSnap((piece) => start([piece]));
  // "Start a look with it" from a piece: the draft opens with that piece on the rack.
  const started = useRef(false);
  useEffect(() => {
    if (pieceId && !started.current) {
      started.current = true;
      void create({ status: 'draft', pieces: [{ pieceId }], anchorPieceId: pieceId });
    }
  });
  const generate = async () => {
    const words = prompt.trim();
    if (words.length < 2 || busy) return;
    setBusy(true);
    try {
      const { jobId } = await api.call('looks.prompt', { input: { prompt: words } });
      router.replace(`/looks/job/${jobId}`);
    } catch (err) {
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
      </View>
      <View className="gap-3 px-5 pt-3">
        <PieceList rows={0} onAdd={() => setPicker({ add: true })}>
          {null}
        </PieceList>
        <PromptCard
          placeholder={copy.placeholder}
          value={prompt}
          onChange={setPrompt}
          chip={{ label: copy.generate, disabled: prompt.trim().length < 2 || busy }}
          onGenerate={() => void generate()}
          busy={busy}
        />
        <Button variant="quiet" className="self-center" onPress={() => router.push('/looks/photo')}>
          {copy.startFromPhoto}
        </Button>
      </View>
      <PiecePicker
        mode={picker}
        onRack={[]}
        onClose={() => setPicker(null)}
        onPick={start}
        onSnap={() => void snap.snap()}
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
  schedule,
  presentation,
  onClose,
}: {
  look: Look;
  forDay: string | null;
  schedule: boolean;
  presentation: DraftPresentation;
  onClose: () => void;
}) {
  const router = useRouter();
  // A saved look is always in edit mode (D17): its changes wait for Update look.
  const mode: 'draft' | 'edit' = look.status === 'saved' ? 'edit' : 'draft';
  const letGo = useLetGo(lookbook.discarded);
  const remove = useRemoveLook();
  const update = useLookDetails(look);
  const model = useApi('me.model.get');
  const danger = useColor('danger');
  const adjustRef = useRef<Adjust | null>(null);
  const editor = useLookEditor(look, { onChange: () => adjustRef.current?.changed() });
  const adjust = useAdjust(look, editor, mode === 'edit' ? 'saved' : 'draft');
  adjustRef.current = adjust;
  useDressOnOpen(look);
  const save = useSaveLook((saved) => {
    // Saved from home's day: that day shows it as the day's card. Else the saved look opens
    // with the diary up, so it can be scheduled in the same breath.
    if (forDay) router.replace({ pathname: '/', params: { day: forDay, saved: saved.id } });
    else router.replace(`/look/${saved.id}?schedule=1`);
  });
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [sheet, setSheet] = useState<DraftSheet | null>(null);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [subview, setSubview] = useState<'tags' | 'seasons' | 'worn' | null>(null);
  const [diary, setDiary] = useState(schedule);
  const [managing, setManaging] = useState(false);
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null);
  const [prompt, setPrompt] = useState('');
  const rows = editor.rack.rows;
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  // A photograph filed from the picker lands where the picker was opened.
  const snapFor = useRef<PickerMode>({ add: true });
  const snap = useSnap((piece) => {
    if ('swap' in snapFor.current) editor.swap(snapFor.current.swap.key, piece);
    else editor.add(piece);
  });
  const busy = adjust.busy || save.isPending || editor.saving;
  const words = prompt.trim();
  // A saved look's edit: anything not yet applied with Update look (D17, D18).
  const pending = mode === 'edit' && (editor.dirty || adjust.stale || words.length > 0);
  const canDone =
    mode === 'draft' ? (rows.length > 0 || look.image !== null) && !busy : !pending && !busy;
  // Update look: the rack written, then the picture drawn for it. Words still in the field go
  // through the thread first; the write waits for their answer to land on the rack.
  const [applying, setApplying] = useState<'asked' | 'reading' | null>(null);
  const commit = () => {
    void editor.update().then((ok) => {
      if (ok) adjust.drawForSave();
    });
  };
  const apply = () => {
    if (mode !== 'edit' || busy || !pending) return;
    if (words && rows.length > 0) {
      adjust.send(words);
      setPrompt('');
      setApplying('asked');
      return;
    }
    setPrompt('');
    commit();
  };
  useEffect(() => {
    if (applying === 'asked' && adjust.busy) setApplying('reading');
    if (applying === 'reading' && !adjust.busy) {
      setApplying(null);
      commit();
    }
  });
  const done = () => {
    if (!canDone) return;
    if (mode === 'draft') {
      adjust.drawForSave();
      save.mutate({ params: { id: look.id }, input: forDay ? { date: forDay } : {} });
      return;
    }
    // On a saved look the tick only closes, once nothing waits for Update look (D18).
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
  // Generate: her words go through the thread and the picture is drawn once the rack is answered.
  // With nothing typed and the picture behind, the chip draws the model instead.
  const generate = () => {
    if (busy) return;
    if (words) {
      adjust.send(words, { draw: true });
      setPrompt('');
      return;
    }
    if (adjust.stale) adjust.updateModel();
  };
  // A saved look's words wait for Update look (D17): its card has no chip of its own.
  const chip =
    mode === 'edit'
      ? null
      : words
        ? { label: copy.generate, disabled: busy }
        : adjust.stale
          ? { label: d.updateModel(adjust.badge), disabled: busy, refresh: true }
          : { label: copy.generate, disabled: true };
  const dialog: { title: string; message: string; actions: AlertDialogAction[] } | null =
    confirm === 'delete'
      ? {
          title: lookbook.savedLook.deleteTitle,
          message: lookbook.savedLook.deleteBody,
          actions: [
            { label: lookbook.savedLook.delete, variant: 'primary', onPress: del },
            { label: lookbook.savedLook.keep, variant: 'outline', onPress: () => setConfirm(null) },
          ],
        }
      : confirm === 'discard'
        ? {
            title: mode === 'edit' ? copy.discardEdit.title : copy.discard.title,
            message: mode === 'edit' ? copy.discardEdit.body : copy.discard.body,
            actions: [
              { label: copy.discard.discard, variant: 'primary', onPress: discard },
              { label: copy.discard.keep, variant: 'outline', onPress: () => setConfirm(null) },
              ...(mode === 'draft'
                ? [{ label: copy.discard.later, variant: 'quiet' as const, onPress: onClose }]
                : []),
            ],
          }
        : null;
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
      footer={
        presentation === 'saved' ? (
          <Button onPress={() => setDiary(true)} className="flex-1" testID="schedule-look">
            {lookbook.savedLook.schedule}
          </Button>
        ) : mode === 'edit' ? (
          // The Edit look sheet's one accept (3k): she stays to see it land.
          <Button onPress={apply} disabled={!pending || busy} icon="refresh" testID="update-look">
            {copy.update}
          </Button>
        ) : undefined
      }
      over={
        <>
          <AdjustSheet
            open={sheet === 'adjust'}
            sending={adjust.busy}
            onSend={(text) => {
              adjust.send(text, { draw: true });
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
        <ImageManager look={look} onDone={() => setManaging(false)} />
      ) : (
        <DraftPhoto
          look={look}
          model={model.data}
          modelPending={model.isPending}
          stale={adjust.stale}
          badge={adjust.badge}
          redressing={adjust.busy && !adjust.state.asking}
          chip={snap.reading ? lookbook.figure.reading : null}
          pronoun={pronoun(model.data)}
          onAdjust={() => setSheet('adjust')}
          onImages={() => setManaging(true)}
          onRetry={adjust.updateModel}
          {...(presentation === 'saved' ? { onBack: close } : {})}
        />
      )}
      <View className="gap-3 px-5 pt-3">
        <Tabs items={TABS} value={tab} onChange={setTab} testID="draft-tabs" />
        {tab === TABS[0] ? (
          <View className="gap-3" testID="pieces-tab">
            <PieceList rows={rows.length} onAdd={() => setPicker({ add: true })}>
              {rows.map((row) => (
                <RackRowCard
                  key={row.key}
                  row={row}
                  image={row.pieceId ? piecesById.get(row.pieceId)?.image : null}
                  mark={editor.mark(row.key)}
                  styled={editor.rack.styling[row.key]}
                  {...(row.proposal ? { onWish: () => editor.wish(row.key) } : {})}
                  onSwap={() =>
                    setPicker({ swap: { key: row.key, name: row.name, category: row.category } })
                  }
                  onRemove={() => editor.remove(row.key)}
                />
              ))}
            </PieceList>
            <PromptCard
              context={forDay ? <ContextChip date={forDay} /> : null}
              thread={<ThreadLines thread={adjust.state.thread} />}
              placeholder={mode === 'edit' ? copy.editPlaceholder : copy.placeholder}
              value={prompt}
              onChange={setPrompt}
              chip={chip}
              onGenerate={mode === 'edit' ? apply : generate}
              {...(adjust.canRedress
                ? { onDescribe: () => setSheet('describe'), describeLabel: d.redress }
                : {})}
              busy={busy}
            />
            {mode === 'edit' && presentation === 'saved' && pending ? (
              // 3e: the small ink pill under the card, once there is something to apply.
              <UpdatePill onPress={apply} busy={busy} />
            ) : null}
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
            />
            {mode === 'edit' ? (
              // Delete (D9): a destructive reveal at the foot of the look's details, asked first.
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirm('delete')}
                className="min-h-11 justify-center self-start"
              >
                <Text size="small" style={{ color: danger, textDecorationLine: 'underline' }}>
                  {copy.delete}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
      <PiecePicker
        mode={picker}
        onRack={rows.flatMap((r) => (r.pieceId ? [r.pieceId] : []))}
        onClose={() => setPicker(null)}
        onPick={(pieces) => {
          if (!picker) return;
          if ('swap' in picker) {
            const [piece] = pieces;
            if (piece) editor.swap(picker.swap.key, piece);
          } else for (const piece of pieces) editor.add(piece);
        }}
        onSnap={() => {
          if (picker) snapFor.current = picker;
          void snap.snap();
        }}
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

// The prompt card (Felix DraftLook): `white` on a 0.5pt `rule-mid` edge — the context chip, the
// thread's lines, the one-line field in the serif and the Generate chip centred under it, at 40%
// until there is something to generate from. "Dress it again" beside it opens the DescribeSheet.
function PromptCard({
  context,
  thread,
  placeholder,
  value,
  onChange,
  chip,
  onGenerate,
  onDescribe,
  describeLabel,
  busy,
}: {
  context?: ReactNode;
  thread?: ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  chip: { label: string; disabled: boolean; refresh?: boolean } | null;
  onGenerate: () => void;
  onDescribe?: () => void;
  describeLabel?: string;
  busy: boolean;
}) {
  return (
    <View
      accessibilityLabel={copy.thread}
      testID="prompt-card"
      className="gap-2 rounded-soft border-rule-mid bg-surface-raised px-1.5 pt-1.5 pb-3"
      style={{ borderWidth: FINE_EDGE }}
    >
      {context ? <View className="flex-row px-1.5 pt-1">{context}</View> : null}
      {thread}
      <View className="flex-row items-center pl-2.5">
        <SheetField
          label={placeholder}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onSend={onGenerate}
          disabled={busy}
          autoFocus={false}
          testID="draft-prompt"
        />
      </View>
      <View className="flex-row items-center justify-center gap-3">
        {chip ? (
          <View style={{ opacity: chip.disabled ? 0.4 : 1 }}>
            <Button
              variant="chip"
              onPress={onGenerate}
              icon={chip.refresh ? 'refresh' : 'check'}
              testID="draft-generate"
            >
              {chip.label}
            </Button>
          </View>
        ) : null}
        {onDescribe ? (
          <Pressable
            accessibilityRole="button"
            onPress={onDescribe}
            disabled={busy}
            className="min-h-7 justify-center"
          >
            <Text size="caption" tone="muted" style={{ textDecorationLine: 'underline' }}>
              {describeLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// 3e's Update look ↻: the chip's size in ink, under the prompt card once a change waits (D17).
// The page's one filled button stays Schedule look; this is the chip-sized accept.
function UpdatePill({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  const onInk = useColor('bg');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.update}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      hitSlop={(MIN_TOUCH - 28) / 2}
      testID="update-look"
      className="min-h-7 flex-row items-center justify-center gap-1.5 self-center rounded-pill bg-ink px-4"
      style={{ opacity: busy ? 0.4 : 1 }}
    >
      <Text
        weight="medium"
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        className="uppercase text-bg"
        style={{ fontSize: 9, letterSpacing: 1.44 }}
      >
        {copy.update}
      </Text>
      <Icon name="refresh" size={11} color={onInk} />
    </Pressable>
  );
}

// The day's place and weather, read from the diary: a passive `warm-100` chip with the pin.
function ContextChip({ date }: { date: string }) {
  const today = useApi('today.get');
  const ink = useColor('ink');
  const day: DiaryDay | undefined = today.data?.diary?.days.find((x) => x.date === date);
  const wx = day?.weather;
  if (!day || !wx) return null;
  const icon = weatherIcon(wx.code);
  return (
    <View
      testID="draft-context"
      className="h-7 flex-row items-center gap-1.5 rounded-pill border-selected-line bg-selected px-2.5"
      style={{ borderWidth: 1 }}
    >
      <Icon name="pin" size={11} color={ink} />
      <Text style={{ fontSize: 11 }}>
        {copy.context(day.place?.city ?? wx.city ?? '', shortRange(wx.tempRange))}
      </Text>
      {icon ? <Icon name={icon} size={11} color={ink} /> : null}
    </View>
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
  badge,
  redressing,
  chip,
  pronoun,
  onAdjust,
  onImages,
  onRetry,
  onBack,
}: {
  look: Look;
  model: Model | undefined;
  modelPending: boolean;
  stale: boolean;
  badge: number;
  redressing: boolean;
  chip: string | null;
  pronoun: string;
  onAdjust: () => void;
  onImages: () => void;
  // "Couldn't dress her · Try again": draws the picture once more.
  onRetry: () => void;
  onBack?: () => void;
}) {
  const control = useColor('border-control');
  const ink = useColor('ink');
  const insets = useSafeAreaInsets();
  // Under the status bar on the saved look's page; under the sheet's header elsewhere.
  const top = (onBack ? insets.top : 0) + 12;
  const own = look.photo !== null && look.record === 'photo';
  const image = own
    ? look.image
    : (look.image ?? (look.model?.status === 'ready' ? look.model : null));
  const uri = renditionUri(image, 720);
  const stand = model?.stand?.imageUrl ?? (model?.filed ? model.cell.imageUrl : null);
  const drawing = look.framePending || look.onModel === 'pending' || redressing;
  const line = useDressingLine(
    look.pieces.length || look.setId ? d.linesAgain : d.linesFirst,
    drawing,
  );
  const failed = !drawing && look.onModel === 'failed' && !own;
  return (
    <View className="overflow-hidden bg-surface-sunk" testID="draft-photo">
      <View
        style={{ opacity: drawing ? 0.6 : stale ? 0.8 : 1 }}
        testID={stale && !drawing ? 'draft-picture-stale' : 'draft-picture'}
      >
        {look.frame && !own ? (
          <LookPicture look={look} />
        ) : uri ? (
          <Image source={uri} alt={looksCopy.page.imageAlt(look.name)} blurhash={image?.blurhash} />
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
      {!drawing && stale && badge ? (
        <View
          accessibilityLabel={d.behind(badge)}
          className="absolute h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-ink px-1.5"
          style={{ top, left: onBack ? 56 : 12 }}
        >
          <Text size="caption" className="text-bg" style={{ fontSize: 10 }}>
            {badge}
          </Text>
        </View>
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
      <ImageStack look={look} onOpen={onImages} />
    </View>
  );
}
