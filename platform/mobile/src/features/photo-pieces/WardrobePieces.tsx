import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { FileReadOutput, Piece, ReadPiece, ReadPieceEdits } from '@robes/contracts';
import { photoPieces as copy, shell, wardrobe as wardrobeCopy } from '@robes/copy';
import { sheetL1For } from '@robes/core';
import {
  answerCard,
  likelyDuplicate,
  pieceWord,
  type WardrobeCardState,
  wardrobeSummary,
} from '@robes/core/photo-pieces';
import {
  Button,
  Eyebrow,
  Field,
  Heading,
  Image,
  Pill,
  PrimaryScope,
  Sheet,
  Skeleton,
  Text,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { usePieces } from '@/features/wardrobe/pieces';
import { renditionUri } from '@/lib/images';
import { CropThumb, PhotoFrame } from './PhotoFrame';
import { type ReadPhoto, usePhotoRead } from './read';

type CardState = WardrobeCardState<ReadPieceEdits>;
interface Card {
  piece: ReadPiece;
  dupId: string | null;
  state: CardState;
}

const sheetOf = (p: { categoryL2: string | null; category: string }): string =>
  (p.categoryL2 && sheetL1For(p.categoryL2)) || p.category;

function Thumb({
  own,
  piece,
  photo,
}: {
  own: Piece | undefined;
  piece: ReadPiece;
  photo: ReadPhoto;
}) {
  const uri = renditionUri(own?.image, 64);
  return uri ? (
    <View style={{ width: 64 }}>
      <Image source={uri} alt="" />
    </View>
  ) : (
    <CropThumb photo={photo} box={piece.box} />
  );
}

// Use case 3 on native: several pieces from one photo, each confirmed and filed on its own.
export function WardrobePieces() {
  const read = usePhotoRead('wardrobe');
  const api = useApiClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pieces } = usePieces();
  const mine = useMemo(() => new Map(pieces.map((p) => [p.id, p])), [pieces]);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [seenJob, setSeenJob] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [filing, setFiling] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [filed, setFiled] = useState<FileReadOutput | null>(null);

  if (read.status === 'done' && read.jobId && seenJob !== read.jobId) {
    setSeenJob(read.jobId);
    setCards(
      read.pieces.map((piece) => ({
        piece,
        dupId: likelyDuplicate(piece.match),
        state: { state: 'pending' },
      })),
    );
  }
  const setState = (index: number, state: CardState, dupId?: string) =>
    setCards((cs) =>
      (cs ?? []).map((c) =>
        c.piece.index === index ? { ...c, state, ...(dupId ? { dupId } : {}) } : c,
      ),
    );

  async function file() {
    if (!cards || !read.jobId) return;
    setFiling(true);
    setFileError(null);
    try {
      const out = await api.call('photoReads.file', {
        params: { id: read.jobId },
        input: {
          answers: cards.map(({ piece, state }) =>
            state.state === 'add'
              ? {
                  index: piece.index,
                  state: 'add' as const,
                  ...(state.edits ? { edits: state.edits } : {}),
                }
              : state.state === 'owned'
                ? { index: piece.index, state: 'owned' as const, pieceId: state.pieceId }
                : { index: piece.index, state: 'skip' as const },
          ),
        },
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
      setFiled(out);
    } catch {
      setFileError(copy.fileFailed);
    } finally {
      setFiling(false);
    }
  }

  if (filed && cards && read.photo) {
    const kept = cards.filter((c) => c.state.state === 'add');
    const owned = cards.flatMap((c) => (c.state.state === 'owned' ? [c.state.pieceId] : []));
    const lines = owned
      .map((id) => {
        const own = mine.get(id);
        return own ? copy.filed.owned(own.label, filed.photoAdded.includes(id)) : null;
      })
      .filter(Boolean)
      .join(' ');
    return (
      <ScrollView contentContainerClassName="gap-5 px-6 pb-12">
        <Heading>{copy.filed.title(filed.filed.length)}</Heading>
        <Text tone="muted">{copy.filed.body(filed.filed.length)}</Text>
        <View className="flex-row flex-wrap gap-3">
          {filed.filed.map((p, i) => {
            const card = kept[i];
            return (
              <View key={p.id} className="gap-1" style={{ width: '45%' }}>
                {card ? (
                  <CropThumb photo={read.photo as ReadPhoto} box={card.piece.box} size={140} />
                ) : null}
                <Eyebrow>{copy.filed.tile(sheetOf(p))}</Eyebrow>
                <Text>{p.label}</Text>
              </View>
            );
          })}
        </View>
        {lines ? <Text size="small">{lines}</Text> : null}
        <Button variant="secondary" onPress={() => router.replace('/wardrobe')}>
          {copy.filed.back}
        </Button>
      </ScrollView>
    );
  }

  if (
    read.status === 'idle' ||
    read.status === 'failed' ||
    (read.status === 'done' && !cards?.length)
  ) {
    const message =
      read.status === 'failed' ? read.error : read.status === 'done' ? copy.none : null;
    return (
      <ScrollView contentContainerClassName="gap-4 px-6 pb-12">
        <Heading>{copy.door.title}</Heading>
        <Text tone="muted">{copy.door.body}</Text>
        <Button variant="secondary" icon="camera" onPress={() => void read.start('camera')}>
          {shell.create.photograph}
        </Button>
        <Button variant="secondary" icon="image" onPress={() => void read.start('library')}>
          {shell.create.cameraRoll}
        </Button>
        {message ? (
          <Text tone="danger" accessibilityRole="alert">
            {message}
          </Text>
        ) : null}
      </ScrollView>
    );
  }

  if (read.status === 'reading' || !cards || !read.photo) {
    return (
      <ScrollView contentContainerClassName="gap-4 px-6 pb-12" accessibilityState={{ busy: true }}>
        <Heading>{copy.reading.title}</Heading>
        <Text tone="muted">{copy.reading.body}</Text>
        {read.photo ? <PhotoFrame photo={read.photo} tags={[]} /> : null}
        <Skeleton width="100%" height={80} />
      </ScrollView>
    );
  }

  const photo = read.photo;
  const open = editing === null ? undefined : cards.find((c) => c.piece.index === editing);
  if (open) {
    return (
      <PieceEditor
        card={open}
        photo={photo}
        onBack={() => setEditing(null)}
        onConfirm={(edits) => {
          setState(open.piece.index, { state: 'add', edits });
          setEditing(null);
        }}
      />
    );
  }

  const sum = wardrobeSummary(cards.map((c) => c.state));
  const pending = cards.filter((c) => c.state.state === 'pending');
  const cta = sum.toAdd
    ? copy.cta.add(sum.toAdd)
    : sum.pending
      ? copy.cta.waiting
      : sum.owned
        ? copy.cta.keepPhoto
        : copy.cta.nothing;
  const record = viewing ? mine.get(viewing) : undefined;
  return (
    <>
      <ScrollView contentContainerClassName="gap-5 px-6 pb-12">
        <Heading>
          {sum.pending ? copy.saw.title : copy.answered.title(sum.toAdd, sum.owned)}
        </Heading>
        <Text tone="muted">{sum.pending ? copy.saw.body(cards.length) : copy.answered.body}</Text>
        <PhotoFrame
          photo={photo}
          tags={pending.map((c) => ({
            index: c.piece.index,
            box: c.piece.box,
            label: pieceWord(c.piece),
          }))}
        />
        <View className="gap-3" accessibilityLabel={copy.cards}>
          {cards.map((card) => (
            <PieceRow
              key={card.piece.index}
              card={card}
              own={card.dupId ? mine.get(card.dupId) : undefined}
              photo={photo}
              onOpen={() =>
                card.dupId && card.state.state !== 'add'
                  ? setViewing(card.dupId)
                  : setEditing(card.piece.index)
              }
              onAnswer={(answer) => {
                setState(card.piece.index, answerCard<ReadPieceEdits>(card.dupId, answer));
                if (card.dupId && answer === 'no') setEditing(card.piece.index);
              }}
              onMine={() => setPicking(card.piece.index)}
            />
          ))}
        </View>
        {fileError ? (
          <Text tone="danger" accessibilityRole="alert">
            {fileError}
          </Text>
        ) : null}
        <PrimaryScope>
          <Button
            disabled={sum.pending > 0 || (!sum.toAdd && !sum.owned)}
            loading={filing}
            loadingLabel={copy.cta.filing}
            onPress={() => void file()}
          >
            {cta}
          </Button>
        </PrimaryScope>
      </ScrollView>
      <Sheet open={!!record} onClose={() => setViewing(null)} title={record?.label}>
        {record ? (
          <View className="gap-3">
            <Text tone="muted">
              {sheetOf(record)}
              {record.brand ? ` · ${record.brand}` : ''}
            </Text>
            {renditionUri(record.image, 200) ? (
              <View style={{ width: 160 }}>
                <Image
                  source={renditionUri(record.image, 200) as string}
                  alt={wardrobeCopy.photoAlt(record.label)}
                />
              </View>
            ) : null}
            <Button
              variant="quiet"
              onPress={() => {
                setViewing(null);
                router.push(`/piece/${record.id}`);
              }}
            >
              {wardrobeCopy.edit}
            </Button>
          </View>
        ) : (
          <View />
        )}
      </Sheet>
      <Sheet open={picking !== null} onClose={() => setPicking(null)} title={copy.picker.title}>
        <ScrollView contentContainerClassName="flex-row flex-wrap gap-3 pb-6">
          {pieces
            .filter((p) => p.status === 'ready')
            .map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={p.label}
                onPress={() => {
                  if (picking !== null) setState(picking, { state: 'owned', pieceId: p.id }, p.id);
                  setPicking(null);
                }}
                style={{ width: '30%' }}
                className="gap-1"
              >
                {renditionUri(p.image, 100) ? (
                  <Image source={renditionUri(p.image, 100) as string} alt="" />
                ) : (
                  <Skeleton width="100%" aspectRatio={4 / 5} />
                )}
                <Text size="caption" numberOfLines={2}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
        </ScrollView>
      </Sheet>
    </>
  );
}

function PieceRow({
  card,
  own,
  photo,
  onOpen,
  onAnswer,
  onMine,
}: {
  card: Card;
  own: Piece | undefined;
  photo: ReadPhoto;
  onOpen(): void;
  onAnswer(answer: 'yes' | 'no'): void;
  onMine(): void;
}) {
  const { piece, state, dupId } = card;
  const row = dupId && state.state !== 'add' ? own : undefined;
  const edits = state.state === 'add' ? state.edits : undefined;
  const label = row?.label ?? edits?.label ?? piece.label;
  const brand = (row ? row.brand : (edits?.brand ?? piece.brand))?.trim() || null;
  const status =
    state.state === 'add'
      ? copy.status.toAdd
      : state.state === 'skip'
        ? copy.status.skipped
        : state.state === 'owned'
          ? own && !own.image
            ? copy.status.ownedPhoto
            : copy.status.owned
          : dupId
            ? `${copy.status.looksLikeYours}${row?.image ? copy.status.ownPhoto : ''}`
            : (piece.color ?? '');
  return (
    <View
      testID={`piece-card-${piece.index}`}
      className={`gap-3 rounded-soft border border-hairline p-3 ${state.state === 'owned' || state.state === 'skip' ? 'opacity-70' : ''}`}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.open(piece.index + 1)}
        onPress={onOpen}
        className="flex-row items-center gap-3"
      >
        {state.state === 'pending' ? (
          <View className="size-6 items-center justify-center rounded-pill bg-ink">
            <Text size="caption" className="text-bg">
              {String(piece.index + 1)}
            </Text>
          </View>
        ) : null}
        <Thumb own={row} piece={piece} photo={photo} />
        <View className="flex-1 gap-0.5">
          <Eyebrow>
            {`${row ? sheetOf(row) : sheetOf(piece)} · ${brand ?? copy.unlabelled}${state.state === 'pending' ? ` · ${dupId ? copy.chip.check : copy.chip.new}` : ''}`}
          </Eyebrow>
          <Text>{label}</Text>
          <Text size="small" tone="muted">
            {status}
          </Text>
        </View>
      </Pressable>
      {state.state === 'pending' ? (
        <View className="flex-row flex-wrap items-center gap-2">
          <Text size="small" className="mr-auto italic">
            {dupId ? copy.ask.yours : copy.ask.add}
          </Text>
          <Pill onPress={() => onAnswer('yes')}>{copy.ask.yes}</Pill>
          <Pill onPress={() => onAnswer('no')}>{dupId ? copy.ask.addIt : copy.ask.skip}</Pill>
          {dupId ? null : (
            <Button variant="quiet" onPress={onMine}>
              {copy.ask.mine}
            </Button>
          )}
        </View>
      ) : null}
    </View>
  );
}

function PieceEditor({
  card,
  photo,
  onBack,
  onConfirm,
}: {
  card: Card;
  photo: ReadPhoto;
  onBack(): void;
  onConfirm(edits: ReadPieceEdits): void;
}) {
  const start = card.state.state === 'add' ? card.state.edits : undefined;
  const [label, setLabel] = useState(start?.label ?? card.piece.label);
  const [brand, setBrand] = useState(start?.brand ?? card.piece.brand ?? '');
  const [color, setColor] = useState(start?.color ?? card.piece.color ?? '');
  const [size, setSize] = useState(start?.size ?? '');
  const [notes, setNotes] = useState(start?.notes ?? card.piece.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  return (
    <ScrollView contentContainerClassName="gap-4 px-6 pb-12">
      <View className="flex-row items-center gap-2">
        <Button variant="quiet" onPress={onBack}>
          {copy.piece.back}
        </Button>
        <Text size="small" tone="muted">
          {copy.piece.crumb(card.piece.index + 1)}
        </Text>
      </View>
      <View className="items-center">
        <CropThumb photo={photo} box={card.piece.box} size={200} />
      </View>
      <Heading size="md">{card.piece.label}</Heading>
      <Field
        label={wardrobeCopy.piece.label}
        value={label}
        onChangeText={setLabel}
        maxLength={120}
        error={error ?? undefined}
      />
      <Field
        label={wardrobeCopy.piece.brand}
        value={brand}
        onChangeText={setBrand}
        maxLength={80}
      />
      <Field
        label={wardrobeCopy.piece.color}
        value={color}
        onChangeText={setColor}
        maxLength={60}
      />
      <Field label={wardrobeCopy.piece.size} value={size} onChangeText={setSize} maxLength={40} />
      <Field
        label={wardrobeCopy.piece.notes}
        value={notes}
        onChangeText={setNotes}
        maxLength={1000}
        multiline
      />
      <PrimaryScope>
        <Button
          onPress={() => {
            if (!label.trim()) {
              setError(copy.piece.nameFirst);
              return;
            }
            onConfirm({
              label: label.trim(),
              brand: brand.trim() || null,
              color: color.trim() || null,
              size: size.trim() || null,
              notes: notes.trim() || null,
            });
          }}
        >
          {copy.piece.confirm}
        </Button>
      </PrimaryScope>
    </ScrollView>
  );
}
