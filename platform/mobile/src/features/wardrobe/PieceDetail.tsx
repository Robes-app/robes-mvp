import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { UpdatePieceInput } from '@robes/contracts';
import { wardrobe as copy, lookbook } from '@robes/copy';
import { dayMonth, longDate } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import {
  Button,
  EmptyState,
  ErrorText,
  Image,
  Sheet,
  Skeleton,
  Tabs,
  Text,
  useColor,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SavedTile } from '@/features/looks/LookTiles';
import { SuggestedRail } from '@/features/looks/SuggestedRail';
import { SettingsRow } from '@/features/you/Settings';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { DeletePieceDialog } from './DeletePieceDialog';
import { StarButton } from './PieceCard';
import { type PieceField, PieceFieldSheet } from './PieceFieldSheet';
import { PieceHeader } from './PieceHeader';
import { PieceRow, RecordRows, type RecordTab } from './PieceRows';
import { READING_REFRESH_MS, useDeletePiece, usePiecePhoto, useStarPiece } from './pieces';

const LOOKS_LIMIT = 30;
const TABS = [copy.piece.tabs.piece, copy.piece.tabs.colour, copy.piece.tabs.wearing] as const;
type TabLabel = (typeof TABS)[number];
const TAB_OF: Record<TabLabel, RecordTab> = {
  [copy.piece.tabs.piece]: 'piece',
  [copy.piece.tabs.colour]: 'colour',
  [copy.piece.tabs.wearing]: 'wearing',
};

// The record (legacy Piece_Sheet 01; Front Door canvas 3b, PRD rev 3 §7.3): the bar with her name
// for it and the Hero Rack star, the photograph edge to edge, then PIECE · COLOUR · WEARING over the
// record's rows. Every fact is a row
// that opens its own drawer — there is no form, so what the title says and what a row says can
// never disagree. Delete piece closes the page, asked first (plan R14). Web twin:
// app/src/app/(app)/piece/[id]/piece-detail.tsx.
export function PieceDetail({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [field, setField] = useState<PieceField | null>(null);
  const [tab, setTab] = useState<TabLabel>(TABS[0]);
  const [open, setOpen] = useState<'wears' | 'looks' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const photo = usePiecePhoto(id);
  const {
    data: piece,
    isPending,
    isError,
    error,
  } = useApi(
    'wardrobe.get',
    { params: { id } },
    {
      // Reading, or the photo she just changed still rendering: refresh until it fills in.
      refetchInterval: (q) =>
        q.state.data?.status === 'reading' ||
        (photo.preview !== null && q.state.data?.image?.status === 'pending')
          ? READING_REFRESH_MS
          : false,
    },
  );
  const [choosing, setChoosing] = useState(false);
  const remove = useDeletePiece();
  const star = useStarPiece();
  const update = useApiMutation('wardrobe.update', {
    onSuccess: async (saved) => {
      queryClient.setQueryData(queryKeys.call('wardrobe.get', { params: { id: saved.id } }), saved);
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
    },
  });

  if (isPending) {
    return (
      <View className="gap-4 px-6">
        <Skeleton width="100%" aspectRatio={4 / 5} />
        <Skeleton shape="text" width="60%" height={28} />
      </View>
    );
  }
  if (isError || !piece) return <EmptyState title={errorMessage(error)} />;

  const uri = renditionUri(piece.image, 400);
  // The photo she just picked stands in until its renditions land.
  const shown = uri ?? photo.preview;
  const reading = piece.status === 'reading';
  const ready = piece.status === 'ready';
  const save = (input: UpdatePieceInput) => update.mutate({ params: { id: piece.id }, input });
  return (
    <View className="flex-1">
      {/* The canvas's bar (3b): ‹, the name in the serif, the Hero Rack star at the right. Her
          name for it is edited from the PIECE tab's Name row (✎). */}
      <PieceHeader
        title={ready ? piece.label : reading ? copy.newPiece : piece.label}
        faint={!ready}
        trailing={
          <StarButton
            label={piece.label}
            on={piece.heroPosition !== null}
            onToggle={() => star(piece)}
          />
        }
      />
      <ScrollView contentContainerClassName="gap-5 pb-10">
        {/* The whole cut-out, edge to edge on white in a 4:5 frame: never cropped at the hem. The
            frame stands without a photo too, so Change photo has a place to sit. */}
        <View className="relative bg-surface-raised">
          {shown ? (
            <Image
              source={shown}
              alt={copy.photoAlt(piece.label)}
              blurhash={uri ? piece.image?.blurhash : null}
              contentFit="contain"
            />
          ) : (
            <View accessibilityElementsHidden style={{ aspectRatio: 4 / 5 }} />
          )}
          <ChangePhoto
            hasPhoto={piece.image !== null}
            busy={photo.busy}
            onPress={() => setChoosing(true)}
          />
        </View>
        <View className="gap-5 px-5">
          {reading ? <Text tone="muted">{copy.reading}</Text> : null}
          {piece.status === 'failed' ? <ErrorText>{copy.noPieceFound}</ErrorText> : null}

          {/* PIECE · COLOUR · WEARING (PRD §7.3): one tab's rows at a time. */}
          <Tabs items={TABS} value={tab} onChange={setTab} testID="piece-tabs" />
          <RecordRows
            values={piece}
            onField={setField}
            only={TAB_OF[tab]}
            wearing={
              <WearingRows
                piece={piece}
                onWorn={() => setOpen('wears')}
                onLooks={() => setOpen('looks')}
              />
            }
          />
          <SuggestedRail pieceId={piece.id} />
          {update.isError ? <ErrorText>{errorMessage(update.error)}</ErrorText> : null}

          {/* Delete piece (§7.3, R14): outline, asked first; the Undo toast still follows. */}
          <Button
            variant="outline"
            onPress={() => setConfirm(true)}
            testID="delete-piece"
            accessibilityHint={copy.piece.deleteBody}
          >
            {copy.piece.delete}
          </Button>
        </View>
      </ScrollView>
      <DeletePieceDialog
        open={confirm}
        onDelete={() => {
          setConfirm(false);
          remove.mutate({ params: { id: piece.id } });
          router.back();
        }}
        onCancel={() => setConfirm(false)}
      />
      <Sheet
        open={open === 'wears'}
        onClose={() => setOpen(null)}
        title={copy.piece.rows.worn}
        closeButton
      >
        <Wears pieceId={piece.id} />
      </Sheet>
      <Sheet
        open={open === 'looks'}
        onClose={() => setOpen(null)}
        title={copy.piece.rows.inLooks}
        closeButton
      >
        <InLooks pieceId={piece.id} onOpen={() => setOpen(null)} />
      </Sheet>
      <PieceFieldSheet
        piece={piece}
        field={field}
        onClose={() => setField(null)}
        onSave={save}
        saving={update.isPending}
      />
      <Sheet
        open={choosing}
        onClose={() => setChoosing(false)}
        title={piece.image ? copy.piece.changePhoto : copy.piece.addPhoto}
        closeButton
      >
        <View className="overflow-hidden rounded-soft border border-hairline bg-surface-raised">
          <SettingsRow
            first
            label={copy.add.doors.photograph}
            onPress={() => {
              setChoosing(false);
              void photo.take('camera');
            }}
          />
          <SettingsRow
            label={copy.add.doors.cameraRoll}
            onPress={() => {
              setChoosing(false);
              void photo.take('library');
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

// The pill at the photograph's bottom-right (legacy rb-pc-rephoto): ↻ Change photo, or the camera
// when there is none yet. Web twin: ChangePhoto in app/src/app/(app)/piece/[id]/piece-detail.tsx.
function ChangePhoto({
  hasPhoto,
  busy,
  onPress,
}: {
  hasPhoto: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const ink = useColor('ink');
  const label = hasPhoto ? copy.piece.changePhoto : copy.piece.addPhoto;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={{ minHeight: 44 }}
      className={`absolute right-3.5 bottom-3.5 flex-row items-center gap-2 rounded-pill border border-hairline bg-bg pr-4 pl-3.5 ${busy ? 'opacity-50' : ''}`}
    >
      <Icon name={hasPhoto ? 'swap' : 'camera'} size={16} color={ink} />
      <Text size="small">{label}</Text>
    </Pressable>
  );
}

// The WEARING tab's first rows (PRD §7.3): Worn ("8 times · last 27 Oct") and In looks, each
// opening its list in a sheet. Web twin: WearingRows in piece-detail.tsx.
function WearingRows({
  piece,
  onWorn,
  onLooks,
}: {
  piece: { id: string; wearCount: number };
  onWorn: () => void;
  onLooks: () => void;
}) {
  const wears = useApi('wardrobe.wears', { params: { id: piece.id } });
  const looks = useApi('looks.list', { input: { limit: LOOKS_LIMIT, pieceId: piece.id } });
  const last = wears.data?.items[0]?.wornOn;
  // Never worn reads "New" and opens nothing (canvas 3b); worn, the count and the last day.
  const worn = piece.wearCount
    ? lookbook.savedLook.details.wornSummary(piece.wearCount, last ? dayMonth(last) : null)
    : copy.card.new;
  return (
    <>
      <PieceRow
        first
        label={copy.piece.rows.worn}
        value={worn}
        {...(piece.wearCount ? { onPress: onWorn } : {})}
      />
      <PieceRow
        label={copy.piece.rows.inLooks}
        value={looks.data ? String(looks.data.items.length) : '—'}
        onPress={onLooks}
      />
    </>
  );
}

// The piece's own record: the days it was on her, and the look she wore it in.
function Wears({ pieceId }: { pieceId: string }) {
  const router = useRouter();
  const faint = useColor('ink-faint');
  const query = useApi('wardrobe.wears', { params: { id: pieceId } });
  const items = query.data?.items ?? [];
  const undated = query.data?.undated ?? 0;
  if (query.isPending) return <Skeleton shape="text" width="60%" />;
  if (items.length === 0 && !undated) {
    return (
      <Text size="small" tone="muted" italic>
        {copy.piece.wears.none}
      </Text>
    );
  }
  return (
    <View className="gap-2 pb-6">
      {items.length ? (
        <View className="overflow-hidden rounded-crisp border border-hairline bg-surface">
          {items.map((wear, i) => (
            <Pressable
              key={wear.id}
              accessibilityRole="link"
              accessibilityLabel={copy.piece.wears.openDay(longDate(wear.wornOn))}
              onPress={() => router.push(`/day/${wear.wornOn}`)}
              className={`flex-row items-center gap-3 px-4 py-3 ${i ? 'border-hairline border-t' : ''}`}
            >
              <Text size="small">{dayMonth(wear.wornOn)}</Text>
              <Text size="caption" tone="faint" italic numberOfLines={1} className="flex-1">
                {wear.lookName ?? ''}
              </Text>
              <Icon name="forward" size={15} color={faint} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {undated ? (
        <Text size="caption" tone="faint" italic>
          {copy.piece.wears.undated(undated)}
        </Text>
      ) : null}
    </View>
  );
}

// "In N looks": the saved looks she has put this piece on, drawn as the Lookbook draws them.
function InLooks({ pieceId, onOpen }: { pieceId: string; onOpen: () => void }) {
  const router = useRouter();
  const query = useApi('looks.list', { input: { limit: LOOKS_LIMIT, pieceId } });
  const items = query.data?.items ?? [];
  if (query.isPending) return <Skeleton shape="text" width="60%" />;
  return (
    <View className="gap-2 pb-6">
      {items.length ? (
        <View className="flex-row flex-wrap gap-3">
          {items.map((look) => (
            <View key={look.id} style={{ width: '47%' }}>
              <SavedTile
                look={look}
                onPress={() => {
                  onOpen();
                  router.push(`/look/${look.id}`);
                }}
              />
            </View>
          ))}
        </View>
      ) : (
        <Text size="small" tone="muted" italic>
          {copy.piece.sections.noLooksHint}
        </Text>
      )}
    </View>
  );
}
