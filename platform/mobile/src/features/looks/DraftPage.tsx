import { ApiClientError } from '@robes/api-client';
import { useApi, useApiClient } from '@robes/api-client/react';
import type { CreateLookInput, Look, Model, Piece } from '@robes/contracts';
import { lookbook as copy, errors, looks as looksCopy } from '@robes/copy';
import { readsAsThey } from '@robes/core/avatar';
import { noteShort } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import {
  Button,
  Eyebrow,
  fonts,
  IconButton,
  Image,
  InlineTitleField,
  PrimaryScope,
  SegmentedControl,
  Skeleton,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { pickOne, usePhotoFiling } from '@/features/home/file-photo';
import { usePieces } from '@/features/wardrobe/pieces';
import { renditionUri } from '@/lib/images';
import { AdjustDock } from './AdjustDock';
import { type Adjust, useAdjust } from './adjust';
import { GenericModelBadge } from './GenericModelBadge';
import { useHerPhoto } from './her-photo';
import { LookMix } from './LookPicture';
import { useLookEditor } from './look-editor';
import { useInvalidateLooks, useLetGo, useSaveLook } from './look-states';
import { RackRowCard } from './RackRow';
import { Scanning } from './ScanLine';
import { SwapSheet } from './SwapSheet';
import { lookTags, TagsSheet } from './TagsSheet';

const d = copy.draft;

const draftsFull = (err: unknown): boolean =>
  err instanceof ApiClientError &&
  err.code === 'conflict' &&
  (err.details as { reason?: string } | undefined)?.reason === 'drafts_full';

const pronoun = (m: Model | undefined) =>
  m?.presence === 'man' ? 'him' : readsAsThey(m?.presence) ? 'them' : 'her';

type Opened = { add: true } | { swap: string };

// A photograph from the sheet's "Photograph one": the camera, then the piece it is filed as.
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

// The draft look (Front Door design 3b, plan 2026-11-03 §1.3): ONE page for every draft, from the
// prompt box or built by hand — eyebrow, the name, the text block, the picture, the note, the tags
// line, the rack, the "Adjust this look…" dock and Discard · Save. The picture is drawn again only
// when she asks (D3); a draft Robes made is pinned to its day as it is saved (D5). Web twin:
// app/src/components/looks/draft-page.tsx.
export function DraftPage({ look, onSaved }: { look: Look; onSaved?: (look: Look) => void }) {
  const router = useRouter();
  const model = useApi('me.model.get');
  const letGo = useLetGo(copy.discarded);
  const [name, setName] = useState(look.nameProvisional ? '' : look.name);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const typed = name.trim() && name.trim() !== look.name ? name.trim() : undefined;
  // A draft Robes made for a day goes onto that day as it is saved; home shows it there.
  const forDay = look.setId ? look.dateHint : null;
  const adjustRef = useRef<Adjust | null>(null);
  const editor = useLookEditor(look, { onChange: () => adjustRef.current?.changed() });
  const adjust = useAdjust(look, editor, 'draft');
  adjustRef.current = adjust;
  const save = useSaveLook((saved) => {
    if (forDay) router.replace({ pathname: '/', params: { day: forDay, saved: saved.id } });
    else onSaved?.(saved);
  });
  const rows = editor.rack.rows;
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  // A photograph filed from the sheet lands where the sheet was opened.
  const snapFor = useRef<Opened>({ add: true });
  const snap = useSnap((piece) => {
    if ('swap' in snapFor.current) editor.swap(snapFor.current.swap, piece);
    else editor.add(piece);
  });
  const herPhoto = useHerPhoto(look);
  const tags = lookTags(look);
  const busy = adjust.busy || save.isPending;

  return (
    <View className="flex-1">
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerClassName="gap-5 px-6 pb-56"
        testID="draft-page"
      >
        <View className="items-center gap-1">
          <Eyebrow>{d.eyebrow}</Eyebrow>
          <InlineTitleField
            value={name}
            label={copy.name.label}
            placeholder={look.name || copy.figure.untitled}
            size={30}
            align="center"
            autoFocus={false}
            onChange={setName}
            onCommit={() => {
              if (typed) editor.rename(typed);
            }}
            onCancel={() => setName(look.nameProvisional ? '' : look.name)}
          />
        </View>
        <LookMix
          yours={rows.filter((r) => r.pieceId).length}
          toFind={rows.filter((r) => r.proposal).length}
          composed={look.composedByRobes}
        />
        <DraftPicture
          look={look}
          model={model.data}
          modelPending={model.isPending}
          stale={adjust.stale}
          badge={adjust.badge}
          redressing={adjust.busy && !adjust.state.asking}
          chip={snap.reading ? copy.figure.reading : null}
          pronoun={pronoun(model.data)}
          photo={herPhoto}
        />
        {herPhoto.sheet}
        {herPhoto.hasPhoto ? (
          <SegmentedControl
            label={looksCopy.page.record.label}
            value={look.record}
            options={[
              { value: 'photo', label: looksCopy.page.record.you },
              { value: 'model', label: looksCopy.page.record.model },
            ]}
            onChange={herPhoto.choose}
          />
        ) : null}
        {look.note ? (
          <Text italic tone="muted" style={{ fontSize: 17, lineHeight: 25 }}>
            {noteShort(look.note)}
          </Text>
        ) : null}
        <View className="flex-row items-center justify-between gap-3 border-hairline border-t pt-4">
          <Text italic tone="muted" className="flex-1" style={{ fontSize: 17 }}>
            {tags.length ? tags.join(' · ') : d.untagged}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={looksCopy.page.editTags}
            onPress={() => setTagsOpen(true)}
            hitSlop={12}
          >
            <Text size="caption" className="uppercase" style={{ fontSize: 9, letterSpacing: 1.8 }}>
              {d.tags}
            </Text>
          </Pressable>
        </View>
        <View className="gap-2.5">
          {rows.map((row) => (
            <RackRowCard
              key={row.key}
              row={row}
              image={row.pieceId ? piecesById.get(row.pieceId)?.image : null}
              mark={editor.mark(row.key)}
              styled={editor.rack.styling[row.key]}
              {...(row.pieceId ? { onOpen: () => router.push(`/piece/${row.pieceId}`) } : {})}
              {...(row.proposal ? { onWish: () => editor.wish(row.key) } : {})}
              onSwap={() => setOpened({ swap: row.key })}
              onRemove={() => editor.remove(row.key)}
            />
          ))}
          <AddPiece disabled={busy} onPress={() => setOpened({ add: true })} />
        </View>
      </ScrollView>
      <WardrobeSheet
        opened={opened}
        rows={rows}
        onClose={() => setOpened(null)}
        onPick={(piece) => {
          if (!opened) return;
          if ('swap' in opened) editor.swap(opened.swap, piece);
          else editor.add(piece);
        }}
        onSnap={() => {
          if (opened) snapFor.current = opened;
          void snap.snap();
        }}
      />
      <TagsSheet look={look} open={tagsOpen} onClose={() => setTagsOpen(false)} />
      <DraftBar
        dock={
          rows.length ? (
            <AdjustDock adjust={adjust} name={look.name} surface="draft" disabled={busy} />
          ) : null
        }
        discardLabel={copy.bar.discard}
        onDiscard={() => {
          letGo(look.id);
          if (forDay) router.replace({ pathname: '/', params: { day: forDay } });
          else router.back();
        }}
        saveLabel={adjust.busy ? d.tileDressing : copy.bar.save}
        onSave={() => {
          adjust.drawForSave();
          save.mutate({
            params: { id: look.id },
            input: { ...(typed ? { name: typed } : {}), ...(forDay ? { date: forDay } : {}) },
          });
        }}
        canSave={(rows.length > 0 || look.image !== null) && !adjust.busy}
        saving={save.isPending}
      />
    </View>
  );
}

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

// The picture (design 3b): the look's frame or her model wearing the rack — the model's base
// layer before anything is drawn — on a cream mat. Stale (dimmed, with the count she is behind)
// until she asks for the model; scanned while it is drawn; the camera adds her photograph.
function DraftPicture({
  look,
  model,
  modelPending,
  stale,
  badge,
  redressing,
  chip,
  pronoun,
  photo,
}: {
  look: Look;
  model: Model | undefined;
  modelPending: boolean;
  stale: boolean;
  badge: number;
  redressing: boolean;
  chip: string | null;
  pronoun: string;
  photo: ReturnType<typeof useHerPhoto>;
}) {
  const control = useColor('border-control');
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
    <View className="overflow-hidden rounded-[10px] border border-rule-mid bg-surface-sunk">
      <View
        className="w-[84%] self-center"
        style={{ opacity: drawing ? 0.6 : stale ? 0.8 : 1 }}
        testID={stale && !drawing ? 'draft-picture-stale' : 'draft-picture'}
      >
        {uri ? (
          <Image source={uri} alt={looksCopy.page.imageAlt(look.name)} blurhash={image?.blurhash} />
        ) : stand ? (
          <Image source={stand} alt={copy.figure.alt} />
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
      {!drawing && stale && badge ? (
        <View
          accessibilityLabel={d.behind(badge)}
          className="absolute top-3 left-3 h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-ink px-1.5"
        >
          <Text size="caption" className="text-bg" style={{ fontSize: 10 }}>
            {badge}
          </Text>
        </View>
      ) : null}
      {failed ? (
        <View className="absolute top-3 left-3 rounded-pill border border-hairline bg-bg px-3 py-1.5">
          <Text size="caption" accessibilityLiveRegion="polite">
            {copy.figure.undressed(pronoun)}
          </Text>
        </View>
      ) : null}
      {own ? null : <GenericModelBadge />}
      <View className="absolute right-3 bottom-3 rounded-pill bg-bg">
        <IconButton
          icon={photo.hasPhoto ? 'swap' : 'camera'}
          label={photo.label}
          disabled={photo.busy}
          onPress={photo.pick}
        />
      </View>
    </View>
  );
}

function AddPiece({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-16 items-center justify-center rounded-soft border border-dashed border-selected-line"
    >
      <Text size="small" tone="muted">
        {copy.rack.addPiece}
      </Text>
    </Pressable>
  );
}

// The one sheet behind the rack's + and a row's hanger.
function WardrobeSheet({
  opened,
  rows,
  onClose,
  onPick,
  onSnap,
}: {
  opened: Opened | null;
  rows: readonly { key: string; name: string; category: string; pieceId: string | null }[];
  onClose: () => void;
  onPick: (piece: Piece) => void;
  onSnap: () => void;
}) {
  const swapRow = opened && 'swap' in opened ? rows.find((r) => r.key === opened.swap) : null;
  return (
    <SwapSheet
      open={opened !== null}
      swapping={
        swapRow
          ? { name: swapRow.name, category: swapRow.category, pieceId: swapRow.pieceId }
          : null
      }
      onRack={rows.flatMap((r) => (r.pieceId ? [r.pieceId] : []))}
      onClose={onClose}
      instant
      onPick={onPick}
      onSnap={onSnap}
    />
  );
}

// Discard · Save pinned to the foot of the screen (legacy .rb-lk-draftbar; a stack screen, so no
// tab bar beneath). The adjust dock floats just above it.
function DraftBar({
  dock,
  discardLabel,
  onDiscard,
  saveLabel,
  onSave,
  canSave,
  saving,
}: {
  dock: ReactNode;
  discardLabel: string;
  onDiscard: () => void;
  saveLabel: string;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
}) {
  return (
    <View className="absolute inset-x-0 bottom-0" testID="look-bar">
      {dock ? <View className="px-4">{dock}</View> : null}
      <View className="mt-3 flex-row items-center justify-between gap-3 border-hairline border-t bg-bg px-6 py-3">
        <PrimaryScope>
          <Button variant="quiet" onPress={onDiscard}>
            {discardLabel}
          </Button>
          <Button onPress={onSave} disabled={!canSave} loading={saving} loadingLabel={d.saving}>
            {saveLabel}
          </Button>
        </PrimaryScope>
      </View>
    </View>
  );
}

// Before the first piece (/looks/new): the model in her base layer and the dashed row; the first
// pick makes the draft, which carries on under its own address.
export function NewDraft({ pieceId }: { pieceId?: string }) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const refresh = useInvalidateLooks();
  const { pieces } = usePieces();
  const model = useApi('me.model.get');
  const control = useColor('border-control');
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async (input: CreateLookInput) => {
    setBusy(true);
    try {
      const made = await api.call('looks.create', { input });
      refresh(made);
      router.replace(`/look/${made.id}`);
    } catch (err) {
      setBusy(false);
      if (!draftsFull(err)) {
        toast.show({ message: errors.internal });
        return;
      }
      const drafts = await api
        .call('looks.list', { input: { limit: 60, status: 'draft' } })
        .catch(() => null);
      const oldest = drafts?.items.at(-1)?.name ?? copy.draftTile.untitled;
      Alert.alert(copy.drafts.fullTitle, copy.drafts.fullBody(oldest), [
        { text: copy.drafts.keep, style: 'cancel' },
        {
          text: copy.drafts.letGo,
          style: 'destructive',
          onPress: () => void create({ ...input, letGoOldest: true }),
        },
      ]);
    }
  };
  const start = (piece: Piece) =>
    void create({
      status: 'draft',
      pieces: [{ pieceId: piece.id }],
      ...(name.trim() ? { name: name.trim() } : {}),
    });
  const snap = useSnap(start);
  // "Start a look with it" from a piece: the draft opens with that piece on the rack.
  const started = useRef(false);
  useEffect(() => {
    const piece = pieceId ? pieces.find((p) => p.id === pieceId) : undefined;
    if (piece && !started.current) {
      started.current = true;
      void create({ status: 'draft', pieces: [{ pieceId: piece.id }], anchorPieceId: piece.id });
    }
  });
  const stand = model.data?.stand?.imageUrl ?? null;

  return (
    <View className="flex-1">
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerClassName="gap-5 px-6 pb-48"
      >
        <View className="items-center gap-1">
          <Eyebrow>{d.eyebrow}</Eyebrow>
          <InlineTitleField
            value={name}
            label={copy.name.label}
            placeholder={copy.figure.untitled}
            size={30}
            align="center"
            autoFocus={false}
            onChange={setName}
          />
        </View>
        <LookMix yours={0} toFind={0} composed={false} />
        <View className="overflow-hidden rounded-[10px] border border-rule-mid bg-surface-sunk">
          <View className="w-[84%] self-center">
            {stand ? (
              <Image source={stand} alt={copy.figure.alt} />
            ) : model.isPending ? (
              <Skeleton width="100%" aspectRatio={4 / 5} />
            ) : (
              <View className="aspect-[4/5] w-full items-center justify-center bg-surface">
                <Icon name="user" size={160} color={control} />
              </View>
            )}
          </View>
          {snap.reading ? (
            <View
              pointerEvents="none"
              className="absolute inset-x-0 items-center"
              style={{ top: '44%' }}
            >
              <View accessibilityLiveRegion="polite" className="rounded-pill bg-bg px-4 py-2">
                <Text size="caption" className="uppercase tracking-widest">
                  {copy.figure.reading}
                </Text>
              </View>
            </View>
          ) : null}
          <GenericModelBadge />
        </View>
        <AddPiece disabled={busy} onPress={() => setOpened(true)} />
        <Button variant="quiet" className="self-center" onPress={() => router.push('/looks/photo')}>
          {copy.figure.start.photo}
        </Button>
      </ScrollView>
      <SwapSheet
        open={opened}
        swapping={null}
        onRack={[]}
        onClose={() => setOpened(false)}
        instant
        onPick={start}
        onSnap={() => void snap.snap()}
      />
      <DraftBar
        dock={null}
        discardLabel={copy.bar.discard}
        onDiscard={() => router.back()}
        saveLabel={copy.bar.save}
        onSave={() => undefined}
        canSave={false}
        saving={busy}
      />
    </View>
  );
}
