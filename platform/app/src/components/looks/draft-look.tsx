'use client';

import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { CreateLookInput, DiaryDay, Look, Model, Piece } from '@robes/contracts';
import { lookbook, looks as looksCopy } from '@robes/copy';
import { readsAsThey } from '@robes/core/avatar';
import { shortRange, weatherIcon } from '@robes/core/weather';
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
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { usePushedView } from '@/components/shell/app-shell';
import { type Adjust, useAdjust } from '@/lib/adjust';
import { errorCopy } from '@/lib/error-copy';
import { usePhotoFiling } from '@/lib/file-photo';
import { useLookEditor } from '@/lib/look-editor';
import { isDraftsFull, useLetGo, useRefreshLooks, useSaveLook } from '@/lib/look-states';
import { ThreadLines } from './adjust-dock';
import { AdjustSheet, DescribeSheet, SheetField } from './draft-sheets';
import { ImageManager } from './image-manager';
import { LookDetails } from './look-details';
import { LookImage } from './look-image';
import { LookPicture } from './look-page';
import { PieceList } from './piece-list';
import { type PickerMode, PiecePicker } from './piece-picker';
import { RackRowCard } from './rack-row';
import { ImageStack } from './saved-look';
import { Scanning } from './scan-line';
import { SeasonsView } from './seasons-view';
import { TagsView } from './tags-view';

const copy = lookbook.draftLook;
const d = lookbook.draft;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const TABS = [lookbook.savedLook.tabs.pieces, lookbook.savedLook.tabs.details] as const;
type Tab = (typeof TABS)[number];

export type DraftPresentation = 'drawer' | 'page';
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

// The draft look (Felix DraftLook; plan 2026-11-06 D14): ONE drawer for every draft — from the
// prompt box, built by hand, started from a piece — and for a saved look's edit, presented over
// whatever started it. The header carries × and the ink done disc; under the photo (the adjust
// disc, the image stack) sit the name, Pieces · Details, the piece list with its add slot, and the
// prompt card whose Generate and the AdjustSheet's Send both feed the one thread (`useAdjust`)
// and draw the picture once it lands; "Dress it again" opens the DescribeSheet. `id` is a look,
// or 'new' before the first piece. The native twin is mobile/src/features/looks/DraftLook.tsx.
export function DraftLook({
  id,
  pieceId,
  day,
  sheet,
  presentation,
  onClose,
}: {
  id: string;
  pieceId?: string;
  // The day the draft is for (home's door): Save pins it there; Discard goes back to that day.
  day?: string;
  // Opened from the saved look's adjust disc: the AdjustSheet is up as it opens.
  sheet?: DraftSheet;
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
      {...(sheet ? { initialSheet: sheet } : {})}
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
  children,
}: {
  presentation: DraftPresentation;
  title: string;
  h1?: string;
  onClose: () => void;
  done: DrawerDone | null;
  over?: ReactNode;
  children: ReactNode;
}) {
  if (presentation === 'drawer') {
    return (
      <Drawer
        open
        title={title}
        onClose={onClose}
        closeLabel={copy.close}
        done={done}
        {...(over ? { over } : {})}
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
    </PageShell>
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
  const refresh = useRefreshLooks();
  const model = useApi('me.model.get');
  const [picker, setPicker] = useState<PickerMode | null>(null);
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
  const start = (pieces: Piece[]) =>
    void create({ status: 'draft', pieces: pieces.map((p) => ({ pieceId: p.id })) });
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
  const generate = async () => {
    const words = prompt.trim();
    if (words.length < 2 || busy) return;
    setBusy(true);
    try {
      const { jobId } = await api.call('looks.prompt', { input: { prompt: words } });
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
      </div>
      <div className="flex flex-col gap-3 px-5 pt-3">
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
        <Link
          href="/looks/new/photo"
          className={`self-center font-sans text-ink-muted text-sm underline underline-offset-4 hover:text-ink ${focus}`}
        >
          {copy.startFromPhoto}
        </Link>
      </div>
      <PiecePicker
        mode={picker}
        onRack={[]}
        onClose={() => setPicker(null)}
        onPick={start}
        onSnap={(file) => void photo.file(file)}
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
  initialSheet,
  presentation,
  onClose,
}: {
  look: Look;
  forDay: string | null;
  initialSheet?: DraftSheet;
  presentation: DraftPresentation;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  // A saved look opens the same drawer in edit mode (D14): edits wait until Update.
  const mode: 'draft' | 'edit' = look.status === 'saved' ? 'edit' : 'draft';
  const letGo = useLetGo(lookbook.discarded);
  const remove = useLetGo(looksCopy.page.removed);
  const model = useApi('me.model.get');
  const adjustRef = useRef<Adjust | null>(null);
  const editor = useLookEditor(look, { onChange: () => adjustRef.current?.changed() });
  const adjust = useAdjust(look, editor, mode === 'edit' ? 'saved' : 'draft');
  adjustRef.current = adjust;
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
  const [sheet, setSheet] = useState<DraftSheet | null>(initialSheet ?? null);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [subview, setSubview] = useState<'tags' | 'seasons' | null>(null);
  const [managing, setManaging] = useState(false);
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null);
  const [prompt, setPrompt] = useState('');
  const rows = editor.rack.rows;
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
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
  const busy = adjust.busy || save.isPending || editor.saving;
  const canDone =
    mode === 'draft'
      ? (rows.length > 0 || look.image !== null) && !busy
      : (editor.dirty || adjust.stale) && !busy;
  const done = () => {
    if (!canDone) return;
    if (mode === 'draft') {
      adjust.drawForSave();
      save.mutate({ params: { id: look.id }, input: forDay ? { date: forDay } : {} });
      return;
    }
    void editor.update().then((ok) => {
      if (!ok) return;
      adjust.drawForSave();
      onClose();
    });
  };
  const close = () => {
    if (mode === 'edit' && !editor.dirty) {
      onClose();
      return;
    }
    setConfirm('discard');
  };
  const discard = () => {
    setConfirm(null);
    if (mode === 'edit') {
      editor.discard();
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
  const words = prompt.trim();
  const generate = () => {
    if (busy) return;
    if (words) {
      adjust.send(words, { draw: true });
      setPrompt('');
      return;
    }
    if (adjust.stale) adjust.updateModel();
  };
  const chip = words
    ? { label: mode === 'edit' ? copy.regenerate : copy.generate, disabled: busy }
    : adjust.stale
      ? { label: d.updateModel(adjust.badge), disabled: busy, refresh: true }
      : { label: mode === 'edit' ? copy.regenerate : copy.generate, disabled: true };
  const dialog =
    confirm === 'delete'
      ? {
          title: lookbook.savedLook.deleteTitle,
          message: lookbook.savedLook.deleteBody,
          actions: [
            { label: lookbook.savedLook.delete, variant: 'primary' as const, onClick: del },
            {
              label: lookbook.savedLook.keep,
              variant: 'outline' as const,
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
          chip={reading ? lookbook.figure.reading : null}
          pronoun={pronoun(model.data)}
          onAdjust={() => setSheet('adjust')}
          onImages={() => setManaging(true)}
        />
      )}
      <div className="flex flex-col gap-3 px-5 pt-3">
        <Tabs items={TABS} value={tab} onChange={setTab} label={lookbook.savedLook.tabs.pieces} />
        {tab === TABS[0] ? (
          <div className="flex flex-col gap-3" data-testid="pieces-tab">
            <PieceList
              label={lookbook.rack.title(rows.length)}
              rows={rows.length}
              onAdd={() => setPicker({ add: true })}
            >
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
              onGenerate={generate}
              {...(adjust.canRedress
                ? { onDescribe: () => setSheet('describe'), describeLabel: d.redress }
                : {})}
              busy={busy}
            />
            {mode === 'edit' ? (
              // Delete lives in edit mode (D9): a destructive reveal, asked before it runs.
              <button
                type="button"
                onClick={() => setConfirm('delete')}
                className={`min-h-11 self-start font-sans text-danger text-sm underline underline-offset-4 hover:opacity-80 ${focus}`}
              >
                {copy.delete}
              </button>
            ) : null}
          </div>
        ) : (
          <LookDetails
            look={look}
            onTags={() => setSubview('tags')}
            onSeasons={() => setSubview('seasons')}
            // The Caption is the name (D16).
            onCaption={(name) => update.mutate({ params: { id: look.id }, input: { name } })}
          />
        )}
      </div>
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
        onSnap={(file) => {
          if (picker) snapFor.current = picker;
          void photo.file(file);
        }}
      />
      <TagsView look={look} open={subview === 'tags'} onBack={() => setSubview(null)} />
      <SeasonsView look={look} open={subview === 'seasons'} onBack={() => setSubview(null)} />
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

// The prompt card (Felix DraftLook): `white` on a 0.5px `rule-mid` edge — the context chip, the
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
  chip: { label: string; disabled: boolean; refresh?: boolean };
  onGenerate: () => void;
  onDescribe?: () => void;
  describeLabel?: string;
  busy: boolean;
}) {
  return (
    <section
      aria-label={copy.thread}
      data-testid="prompt-card"
      className="flex flex-col gap-2 rounded-soft border-[0.5px] border-rule-mid bg-surface-raised px-1.5 pt-1.5 pb-3"
    >
      {context ? <div className="px-1.5 pt-1">{context}</div> : null}
      {thread}
      <div className="flex min-h-13 items-center pl-2.5">
        <SheetField
          label={placeholder}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onSend={onGenerate}
          disabled={busy}
          autoFocus={false}
          className="py-3.5"
          testId="draft-prompt"
        />
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="chip"
          onClick={onGenerate}
          aria-disabled={chip.disabled}
          className={chip.disabled ? 'opacity-40' : undefined}
          data-testid="draft-generate"
        >
          {chip.label}
          {chip.refresh ? (
            <Icon name="undo" size={11} className="-scale-x-100" />
          ) : (
            <Icon name="check" size={11} />
          )}
        </Button>
        {onDescribe ? (
          <button
            type="button"
            onClick={onDescribe}
            disabled={busy}
            className={`min-h-7 font-sans text-[11px] text-ink-muted underline underline-offset-4 hover:text-ink disabled:text-ink-faint ${focus}`}
          >
            {describeLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

// The day's place and weather, read from the diary: a passive `warm-100` chip with the pin.
function ContextChip({ date }: { date: string }) {
  const today = useApi('today.get');
  const day: DiaryDay | undefined = today.data?.diary?.days.find((x) => x.date === date);
  const wx = day?.weather;
  if (!day || !wx) return null;
  const icon = weatherIcon(wx.code);
  return (
    <span
      data-testid="draft-context"
      className="inline-flex h-7 items-center gap-1.5 rounded-pill border border-selected-line bg-selected px-2.5 font-sans text-[11px] text-ink"
    >
      <Icon name="pin" size={11} />
      {copy.context(day.place?.city ?? wx.city ?? '', shortRange(wx.tempRange))}
      {icon ? <Icon name={icon} size={11} /> : null}
    </span>
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
  badge,
  redressing,
  chip,
  pronoun,
  onAdjust,
  onImages,
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
}) {
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
  const glass =
    "absolute z-10 flex items-center justify-center rounded-pill bg-veil-soft text-ink backdrop-blur-[8px] after:absolute after:-inset-2.5 after:content-['']";
  return (
    <div className="relative overflow-hidden bg-surface-sunk" data-testid="draft-photo">
      <div
        className={`transition-[opacity,filter] duration-500 ${stale && !drawing ? 'opacity-80 grayscale-[.75]' : ''} ${drawing ? 'opacity-60' : ''}`}
        data-testid={stale && !drawing ? 'draft-picture-stale' : 'draft-picture'}
      >
        {look.frame && !own ? (
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
      {!drawing && stale && badge ? (
        <span
          title={d.stale}
          className="absolute top-3 left-3 z-10 flex h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-ink px-1.5 font-medium font-sans text-[10px] text-bg"
        >
          <span aria-hidden>{badge}</span>
          <span className="sr-only">{d.behind(badge)}</span>
        </span>
      ) : null}
      {failed ? (
        <span
          role="status"
          className="absolute top-3 right-3 z-10 rounded-pill border border-hairline bg-bg/90 px-3 py-1.5 font-sans text-ink text-xs"
        >
          {lookbook.figure.undressed(pronoun)}
        </span>
      ) : null}
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
      <ImageStack look={look} onOpen={onImages} />
    </div>
  );
}
