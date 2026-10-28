import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Piece, UpdatePieceInput } from '@robes/contracts';
import { wardrobe as copy, lookbook, looks as looksCopy } from '@robes/copy';
import { dayMonth, longDate } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import {
  Button,
  EmptyState,
  ErrorText,
  Eyebrow,
  Heading,
  IconButton,
  Image,
  PrimaryScope,
  Sheet,
  Skeleton,
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
import { StarButton } from './PieceCard';
import { type PieceField, PieceFieldSheet } from './PieceFieldSheet';
import { RecordRows } from './PieceRows';
import { READING_REFRESH_MS, useDeletePiece, usePiecePhoto, useStarPiece } from './pieces';

const LOOKS_LIMIT = 30;

// The record (legacy Piece_Sheet 01): the photograph, her name for it with the pencil on it, the
// facts she has given, then the days she wore it. Every fact is a row that opens its own drawer —
// there is no form, so what the title says and what a row says can never disagree.
export function PieceDetail({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [field, setField] = useState<PieceField | null>(null);
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
      <ScrollView contentContainerClassName="gap-5 px-6 pb-10">
        {/* The whole cut-out, contained on white in a 4:5 frame: never cropped at the hem. The
            frame stands without a photo too, so Change photo has a place to sit. */}
        <View className="relative rounded-crisp border border-hairline bg-surface-raised p-4">
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
        <View className="gap-1.5">
          <View className="flex-row items-start gap-2">
            {/* Until Robes has read it, "New piece" is a placeholder, not a fact. */}
            {ready ? (
              <Heading size="md" className="min-w-0 flex-1">
                {piece.label}
              </Heading>
            ) : (
              <Text tone="faint" italic accessibilityRole="header" className="flex-1">
                {reading ? copy.newPiece : piece.label}
              </Text>
            )}
            {/* The pencil edits the name where it is written, never a field further down. */}
            <IconButton
              icon="pencil"
              label={copy.piece.editName}
              onPress={() => setField('label')}
            />
            <StarButton
              label={piece.label}
              on={piece.heroPosition !== null}
              onToggle={() => star(piece)}
            />
          </View>
          {/* The brand is its own line, and says so when it is missing — one source, the piece. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={piece.brand ?? copy.piece.addBrand}
            onPress={() => setField('brand')}
          >
            <Text tone="muted" italic>
              {piece.brand ?? copy.piece.addBrand}
            </Text>
          </Pressable>
          {reading ? <Text tone="muted">{copy.reading}</Text> : null}
          {piece.status === 'failed' ? <ErrorText>{copy.noPieceFound}</ErrorText> : null}
        </View>

        {ready ? <Stats piece={piece} /> : null}

        <PrimaryScope>
          <View className="gap-3">
            <Button
              icon="looks"
              disabled={reading}
              onPress={() =>
                router.push({ pathname: '/looks/style', params: { pieceId: piece.id } })
              }
            >
              {copy.piece.stylePiece}
            </Button>
            <Button
              variant="secondary"
              disabled={reading}
              onPress={() => router.push({ pathname: '/looks/new', params: { pieceId: piece.id } })}
            >
              {lookbook.startLook}
            </Button>
          </View>
        </PrimaryScope>

        <RecordRows values={piece} onField={setField} />

        <Wears pieceId={piece.id} />
        <InLooks pieceId={piece.id} />
        <SuggestedRail pieceId={piece.id} />
        {update.isError ? <ErrorText>{errorMessage(update.error)}</ErrorText> : null}

        <Button
          variant="quiet"
          icon="trash"
          className="self-center"
          onPress={() => {
            remove.mutate({ params: { id: piece.id } });
            router.back();
          }}
        >
          {copy.piece.remove}
        </Button>
      </ScrollView>
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

// The piece's own record: the days it was on her, and the look she wore it in.
function Wears({ pieceId }: { pieceId: string }) {
  const router = useRouter();
  const faint = useColor('ink-faint');
  const query = useApi('wardrobe.wears', { params: { id: pieceId } });
  const items = query.data?.items ?? [];
  const undated = query.data?.undated ?? 0;
  if (query.isPending) return <Skeleton shape="text" width="60%" />;
  // Nothing worn yet: the stats strip already says so, so the section stands down (beta).
  if (items.length === 0 && !undated) return null;
  return (
    <View className="gap-2">
      <Eyebrow>{copy.piece.sections.wears}</Eyebrow>
      {items.length ? (
        <>
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
        </>
      ) : null}
      {undated ? (
        <Text size="caption" tone="faint" italic>
          {copy.piece.wears.undated(undated)}
        </Text>
      ) : null}
    </View>
  );
}

// Worn · Last worn · In looks, as beta's strip reads them: facts side by side under the name,
// between two hairlines. The web twin is Stats in app/src/app/(app)/piece/[id]/piece-detail.tsx.
function Stats({ piece }: { piece: Piece }) {
  const wears = useApi('wardrobe.wears', { params: { id: piece.id } });
  const looks = useApi('looks.list', { input: { limit: LOOKS_LIMIT, pieceId: piece.id } });
  const last = wears.data?.items[0]?.wornOn;
  const cells: [string, string][] = [
    [
      copy.piece.stats.worn,
      piece.wearCount ? looksCopy.page.wears.count(piece.wearCount) : copy.piece.stats.never,
    ],
    [copy.piece.stats.lastWorn, last ? dayMonth(last) : '—'],
    [copy.piece.stats.inLooks, looks.data ? String(looks.data.items.length) : '—'],
  ];
  return (
    <View className="flex-row border-hairline border-y">
      {cells.map(([k, v], i) => (
        <View
          key={k}
          className={`flex-1 gap-1.5 py-3 ${i ? 'border-hairline border-l pl-3.5' : ''}`}
        >
          <Eyebrow>{k}</Eyebrow>
          <Text size="small" numberOfLines={1}>
            {v}
          </Text>
        </View>
      ))}
    </View>
  );
}

// "In N looks": the saved looks she has put this piece on, drawn as the Lookbook draws them.
function InLooks({ pieceId }: { pieceId: string }) {
  const router = useRouter();
  const query = useApi('looks.list', { input: { limit: LOOKS_LIMIT, pieceId } });
  const items = query.data?.items ?? [];
  if (query.isPending) return <Skeleton shape="text" width="60%" />;
  return (
    <View className="gap-2">
      <Eyebrow>
        {items.length ? copy.piece.sections.looks(items.length) : copy.piece.sections.noLooks}
      </Eyebrow>
      {items.length ? (
        <View className="flex-row flex-wrap gap-3">
          {items.map((look) => (
            <View key={look.id} style={{ width: '47%' }}>
              <SavedTile look={look} onPress={() => router.push(`/look/${look.id}`)} />
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
