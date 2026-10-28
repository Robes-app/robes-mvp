import { ApiClientError } from '@robes/api-client';
import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { CreateLookInput, Look, Model, Piece } from '@robes/contracts';
import { lookbook as copy, errors, looks as looksCopy } from '@robes/copy';
import {
  compositionKey,
  DRESS_DEBOUNCE_MS,
  filledSlots,
  HOTSPOTS,
  type HotspotSlot,
  placePick,
} from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import {
  Button,
  Eyebrow,
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
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { pickOne, usePhotoFiling } from '@/features/home/file-photo';
import { usePieces } from '@/features/wardrobe/pieces';
import { renditionUri } from '@/lib/images';
import { GenericModelBadge } from './GenericModelBadge';
import { useHerPhoto } from './her-photo';
import { LookPromptBox } from './LookPromptBox';
import { useLookEditor } from './look-editor';
import { useInvalidateLooks, useLetGo, useSaveLook } from './look-states';
import { RackRowCard } from './RackRow';
import { SwapSheet } from './SwapSheet';

const draftsFull = (err: unknown): boolean =>
  err instanceof ApiClientError &&
  err.code === 'conflict' &&
  (err.details as { reason?: string } | undefined)?.reason === 'drafts_full';

const pronoun = (m: Model | undefined) =>
  m?.presence === 'man' ? 'him' : m?.presence === 'unspecified' ? 'them' : 'her';

type Opened = { slot: HotspotSlot } | { add: true } | { swap: string };

// The draft look (legacy 4d + the 2026-10-15 passes): her model — or Robes' generic one — on a 4:5
// canvas with a hotspot per part of her; a pick dresses her in place, the rack beneath, and the
// draft stays in this one composer until Save. Nothing is a row until the first piece lands; then
// it is a draft that waits in In progress. The web twin is app/src/components/looks/composer.tsx.
export function Composer({
  pieceId,
  look,
  onSaved,
}: {
  pieceId?: string;
  look?: Look;
  onSaved?: (look: Look) => void;
}) {
  return look ? (
    <DraftComposer look={look} {...(onSaved ? { onSaved } : {})} />
  ) : (
    <EmptyComposer {...(pieceId ? { pieceId } : {})} />
  );
}

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

// shortcut: no "Add your photograph" here yet (beta showed it on the new canvas) — her photograph
// lands on a look, and nothing is a row until the first piece; the camera stands from the draft on.
function EmptyComposer({ pieceId }: { pieceId?: string }) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const refresh = useInvalidateLooks();
  const { pieces } = usePieces();
  const model = useApi('me.model.get');
  const [opened, setOpened] = useState<Opened | null>(null);
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

  return (
    <DraftLayout
      name={name}
      onName={setName}
      count={0}
      canvas={
        <ModelCanvas
          model={model.data}
          pending={model.isPending}
          filled={new Set()}
          chip={snap.reading ? copy.figure.reading : null}
          disabled={busy}
          onHotspot={(slot) => setOpened({ slot })}
        />
      }
      footer={
        <DraftBar
          onDiscard={() => router.back()}
          onSave={() => undefined}
          canSave={false}
          saving={busy}
        />
      }
    >
      <AddPiece onPress={() => setOpened({ add: true })} />
      <Button variant="quiet" className="self-center" onPress={() => router.push('/looks/photo')}>
        {copy.figure.start.photo}
      </Button>
      <WardrobeSheet
        opened={opened}
        rows={[]}
        onClose={() => setOpened(null)}
        onPick={start}
        onSnap={() => void snap.snap()}
      />
    </DraftLayout>
  );
}

// Her model wears what is on the rack, re-drawn once a composition settles (DRESS_DEBOUNCE_MS):
// the server keys each render by the model and the rack, so asking for one already drawn spends
// nothing. While the next frame comes the last one stays up under "Dressing her…".
function useDress(look: Look, enabled: boolean) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const key = compositionKey(look.pieces.map((p) => p.piece.id));
  const settled = useRef(look.onModel === 'ready' ? key : null);
  const [asked, setAsked] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || !key || key === asked) return;
    const t = setTimeout(() => {
      setAsked(key);
      void api
        .call('looks.renderOnModel', { params: { id: look.id } })
        .then(() =>
          queryClient.invalidateQueries({
            queryKey: queryKeys.call('looks.get', { params: { id: look.id } }),
          }),
        )
        // No model to stand on yet, or no image quota: the canvas stays as it is.
        .catch(() => undefined);
    }, DRESS_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [api, queryClient, enabled, key, asked, look.id]);
  return (
    enabled &&
    key !== '' &&
    (look.onModel === 'pending' || (key !== asked && key !== settled.current))
  );
}

function DraftComposer({ look, onSaved }: { look: Look; onSaved?: (look: Look) => void }) {
  const router = useRouter();
  const editor = useLookEditor(look);
  const model = useApi('me.model.get');
  const save = useSaveLook(onSaved);
  const letGo = useLetGo(copy.discarded);
  const [name, setName] = useState(look.nameProvisional ? '' : look.name);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [asking, setAsking] = useState(false);
  const rows = editor.rack.rows;
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const dressing = useDress(look, Boolean(model.data) && look.pieces.length > 0);
  const typed = name.trim() && name.trim() !== look.name ? name.trim() : undefined;

  const pick = (piece: Piece, how: Opened) => {
    if ('swap' in how) return editor.swap(how.swap, piece);
    const placed = placePick(rows, piece.category, 'slot' in how);
    if ('swap' in placed) editor.swap(placed.swap, piece);
    else editor.add(piece);
  };
  // A photograph filed from the sheet lands where the sheet was opened.
  const snapFor = useRef<Opened>({ add: true });
  const snap = useSnap((piece) => pick(piece, snapFor.current));
  // Her photograph of the look (beta's camera on the canvas): once kept, You · Model under the
  // canvas picks which picture stands — her photograph, or her model wearing the rack.
  // Twin of web components/looks/composer.tsx.
  const herPhoto = useHerPhoto(look);
  const own = look.photo !== null && look.record === 'photo';
  const rendered = own
    ? look
    : look.onModel && look.model && look.pieces.length > 0
      ? { ...look, image: look.model }
      : null;

  return (
    <DraftLayout
      name={name}
      onName={setName}
      onNameDone={() => {
        if (typed) editor.rename(typed);
      }}
      count={rows.length}
      canvas={
        <>
          <ModelCanvas
            model={model.data}
            pending={model.isPending}
            rendered={rendered}
            own={own}
            filled={filledSlots(rows.map((r) => r.category))}
            chip={
              snap.reading
                ? copy.figure.reading
                : dressing && !own
                  ? copy.figure.dressing(pronoun(model.data))
                  : null
            }
            onHotspot={(slot) => setOpened({ slot })}
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
        </>
      }
      footer={
        <DraftBar
          onDiscard={() => {
            letGo(look.id);
            router.back();
          }}
          onSave={() =>
            save.mutate({ params: { id: look.id }, input: typed ? { name: typed } : {} })
          }
          canSave={rows.length > 0}
          saving={save.isPending}
          onAsk={() => setAsking((a) => !a)}
          asking={asking}
          ask={
            asking ? (
              <LookPromptBox
                lookId={look.id}
                name={look.name}
                surface="draft"
                rack={editor.rack}
                anchorPieceId={look.anchor?.id ?? null}
                changed={editor.changed}
                draft
                onAnswer={editor.answer}
              />
            ) : null
          }
        />
      }
    >
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
      <AddPiece onPress={() => setOpened({ add: true })} />
      <WardrobeSheet
        opened={opened}
        rows={rows}
        onClose={() => setOpened(null)}
        onPick={(piece) => opened && pick(piece, opened)}
        onSnap={() => {
          if (opened) snapFor.current = opened;
          void snap.snap();
        }}
      />
    </DraftLayout>
  );
}

function AddPiece({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-13 items-center justify-center rounded-soft border border-dashed border-border-control"
    >
      <Text size="small" tone="muted">
        {copy.rack.addPiece}
      </Text>
    </Pressable>
  );
}

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
  const slot = opened && 'slot' in opened ? HOTSPOTS.find((h) => h.slot === opened.slot) : null;
  return (
    <SwapSheet
      open={opened !== null}
      swapping={
        swapRow
          ? { name: swapRow.name, category: swapRow.category, pieceId: swapRow.pieceId }
          : null
      }
      opensOn={slot?.opensOn ?? null}
      {...(slot ? { title: copy.sheet.slot[slot.slot] } : {})}
      onRack={rows.flatMap((r) => (r.pieceId ? [r.pieceId] : []))}
      onClose={onClose}
      instant
      onPick={onPick}
      onSnap={onSnap}
    />
  );
}

function DraftLayout({
  name,
  onName,
  onNameDone,
  count,
  canvas,
  footer,
  children,
}: {
  name: string;
  onName: (v: string) => void;
  onNameDone?: () => void;
  count: number;
  canvas: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="flex-1">
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerClassName="gap-6 px-6 pb-48"
      >
        <View className="items-center gap-1">
          <Eyebrow>{copy.eyebrow.draft}</Eyebrow>
          {/* The title is the name: tap the italic line and write over it. */}
          <InlineTitleField
            value={name}
            label={copy.name.label}
            placeholder={copy.figure.untitled}
            size={30}
            italic
            align="center"
            autoFocus={false}
            onChange={onName}
            onCommit={() => onNameDone?.()}
          />
        </View>
        <View className="gap-3">
          <Eyebrow>{copy.figure.head(count)}</Eyebrow>
          {canvas}
        </View>
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

// Her own photograph (`own`) stands without the hotspots: they are drawn for the model's figure.
// The camera bottom-right adds her photograph, ↻ once one is kept (as on the saved look).
function ModelCanvas({
  model,
  pending,
  rendered = null,
  own = false,
  filled,
  chip,
  disabled = false,
  onHotspot,
  photo,
}: {
  model: Model | undefined;
  pending: boolean;
  rendered?: Look | null;
  own?: boolean;
  filled: Set<HotspotSlot>;
  chip: string | null;
  disabled?: boolean;
  onHotspot: (slot: HotspotSlot) => void;
  photo?: { hasPhoto: boolean; label: string; busy: boolean; pick: () => void };
}) {
  const control = useColor('border-control');
  const stand = model?.stand?.imageUrl ?? (model?.filed ? model.cell.imageUrl : null);
  const renderUri = rendered ? renditionUri(rendered.image, 720) : null;
  return (
    <View className="overflow-hidden rounded-crisp border border-hairline">
      {renderUri ? (
        <Image
          source={renderUri}
          alt={copy.prompt.label(rendered?.name ?? '')}
          blurhash={rendered?.image?.blurhash}
        />
      ) : stand ? (
        <Image source={stand} alt={copy.figure.alt} />
      ) : pending ? (
        <Skeleton width="100%" aspectRatio={4 / 5} />
      ) : (
        <View className="aspect-[4/5] w-full items-center justify-center bg-surface">
          <Icon name="user" size={160} color={control} />
        </View>
      )}
      {(own ? [] : HOTSPOTS).map((h) => {
        const on = filled.has(h.slot);
        return (
          <View key={h.slot} className="absolute inset-x-0 items-center" style={{ top: h.top }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.figure.slots[h.slot]}
              accessibilityState={{ selected: on }}
              disabled={disabled}
              onPress={() => onHotspot(h.slot)}
              className={`min-h-11 -translate-y-1/2 justify-center rounded-pill border px-4 ${on ? 'border-selected-line bg-selected' : 'border-hairline bg-surface-raised'}`}
            >
              <Text size="small">
                {on ? copy.figure.filled[h.slot] : copy.figure.slots[h.slot]}
              </Text>
            </Pressable>
          </View>
        );
      })}
      {chip ? (
        <View
          pointerEvents="none"
          className="absolute inset-x-0 items-center"
          style={{ top: '44%' }}
        >
          <View
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            className="rounded-pill bg-bg px-4 py-2"
          >
            <Text size="caption" className="uppercase tracking-widest">
              {chip}
            </Text>
          </View>
        </View>
      ) : null}
      {/* No model of her own yet: the generic one stands in, and the badge is the door. */}
      {own ? null : <GenericModelBadge />}
      {photo ? (
        <View className="absolute right-3 bottom-3 rounded-pill bg-bg">
          <IconButton
            icon={photo.hasPhoto ? 'swap' : 'camera'}
            label={photo.label}
            disabled={disabled || photo.busy}
            onPress={photo.pick}
          />
        </View>
      ) : null}
    </View>
  );
}

// Discard · Save pinned to the foot of the screen (legacy .rb-lk-draftbar; this is a stack screen,
// so there is no tab bar beneath it). The ✦ floats just above it.
function DraftBar({
  onDiscard,
  onSave,
  canSave,
  saving,
  onAsk,
  asking = false,
  ask = null,
}: {
  onDiscard: () => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
  onAsk?: () => void;
  asking?: boolean;
  ask?: ReactNode;
}) {
  return (
    <View className="absolute inset-x-0 bottom-0" testID="look-bar">
      <View className="gap-3 px-4">
        {ask}
        {onAsk ? (
          <View className="items-end">
            <IconButton
              icon={asking ? 'close' : 'looks'}
              label={copy.figure.prompt}
              onPress={onAsk}
              className="rounded-pill border border-hairline bg-surface-raised"
            />
          </View>
        ) : null}
      </View>
      <View
        // StackScreen already keeps the safe area clear beneath.
        className="mt-3 flex-row items-center justify-between gap-3 border-t border-hairline bg-bg px-6 py-3"
      >
        <PrimaryScope>
          <Button variant="quiet" onPress={onDiscard}>
            {copy.bar.discard}
          </Button>
          <Button onPress={onSave} disabled={!canSave} loading={saving}>
            {copy.bar.save}
          </Button>
        </PrimaryScope>
      </View>
    </View>
  );
}
