import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { LookAnswer, Piece, ReadPiece } from '@robes/contracts';
import { lookbook, photoPieces, shell } from '@robes/copy';
import { sheetL1For } from '@robes/core';
import type { LookCardState } from '@robes/core/photo-pieces';
import {
  Button,
  ErrorText,
  Eyebrow,
  Heading,
  IconButton,
  Image,
  InlineTitleField,
  Pill,
  PrimaryScope,
  Sheet,
  Skeleton,
  Text,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { usePieces } from '@/features/wardrobe/pieces';
import { renditionUri } from '@/lib/images';
import { CropThumb, PhotoFrame } from './PhotoFrame';
import { type ReadPhoto, usePhotoRead } from './read';

const copy = photoPieces.look;
interface Card {
  piece: ReadPiece;
  state: LookCardState;
}

const sheetOf = (p: { categoryL2: string | null; category: string }): string =>
  (p.categoryL2 && sheetL1For(p.categoryL2)) || p.category;

// Her local calendar day ("Wearing it today").
function today(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

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

// Use case 2b on native: every piece in her photo confirmed (hers, new, or left out) before Save.
export function LookFromPhoto() {
  const read = usePhotoRead('look_photo');
  const model = useApi('me.model.get');
  const api = useApiClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pieces } = usePieces();
  const mine = useMemo(() => new Map(pieces.map((p) => [p.id, p])), [pieces]);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [seenJob, setSeenJob] = useState<string | null>(null);
  const [finding, setFinding] = useState<number | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [wear, setWear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (read.status === 'done' && read.jobId && seenJob !== read.jobId) {
    setSeenJob(read.jobId);
    setCards(read.pieces.map((piece) => ({ piece, state: { state: 'pending' } })));
  }
  const answer = (index: number, state: LookCardState) =>
    setCards((cs) => (cs ?? []).map((c) => (c.piece.index === index ? { ...c, state } : c)));

  async function save() {
    if (!read.jobId || !cards) return;
    setSaving(true);
    setError(null);
    try {
      const look = await api.call('photoReads.look', {
        params: { id: read.jobId },
        input: {
          answers: cards.map(
            ({ piece, state }): LookAnswer =>
              state.state === 'owned'
                ? { index: piece.index, state: 'owned', pieceId: state.pieceId }
                : { index: piece.index, state: state.state === 'new' ? 'new' : 'skip' },
          ),
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(wear ? { wornOn: today() } : {}),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') }),
      ]);
      router.replace(`/look/${look.id}`);
    } catch {
      setError(copy.saveFailed);
      setSaving(false);
    }
  }

  if (read.status === 'idle' || read.status === 'failed') {
    return (
      <ScrollView contentContainerClassName="gap-4 px-6 pb-12">
        <Heading>{copy.start.title}</Heading>
        <Text tone="muted">{copy.start.body}</Text>
        <Button variant="secondary" icon="camera" onPress={() => void read.start('camera')}>
          {shell.create.photograph}
        </Button>
        <Button variant="secondary" icon="image" onPress={() => void read.start('library')}>
          {shell.create.cameraRoll}
        </Button>
        {read.status === 'failed' && read.photo ? (
          <View className="w-40">
            <Image source={read.photo.uri} alt={photoPieces.photoAlt} aspect="4:5" />
          </View>
        ) : null}
        {read.status === 'failed' ? (
          <ErrorText>{read.error === photoPieces.failed ? copy.readFailed : read.error}</ErrorText>
        ) : null}
      </ScrollView>
    );
  }

  const reading = read.status === 'reading';
  const list = cards ?? [];
  const pending = list.filter((c) => c.state.state === 'pending');
  const onRack = list.filter((c) => c.state.state === 'owned' || c.state.state === 'new');
  const findCard = finding === null ? undefined : list.find((c) => c.piece.index === finding);
  const taken = onRack.flatMap((c) => (c.state.state === 'owned' ? [c.state.pieceId] : []));
  const options = findCard
    ? pieces.filter(
        (p) =>
          p.status === 'ready' && sheetOf(p) === sheetOf(findCard.piece) && !taken.includes(p.id),
      )
    : [];
  const pick = options.find((p) => p.id === chosen);
  const closeFind = () => {
    setChosen(null);
    setFinding(null);
  };
  return (
    <>
      {/* The read happens INSIDE the draft (legacy 2b): the same masthead, the same canvas — her
          model stands in it while Robes reads, then her photograph takes its place with a dot per
          piece — and one bar at the foot. It is never a screen of its own. */}
      <ScrollView contentContainerClassName="gap-5 px-6 pb-32">
        <View className="items-center gap-2">
          <Eyebrow>{lookbook.eyebrow.draft}</Eyebrow>
          {/* The draft's masthead, as in the composer; the name rides with Save. */}
          <InlineTitleField
            value={name}
            label={lookbook.name.label}
            placeholder={lookbook.figure.untitled}
            size={30}
            italic
            align="center"
            autoFocus={false}
            onChange={setName}
          />
        </View>
        <Eyebrow>{reading ? copy.headReading : copy.head(onRack.length)}</Eyebrow>
        {read.photo && !reading ? (
          <PhotoFrame
            photo={read.photo}
            dots
            tags={pending.map((c) => ({
              index: c.piece.index,
              box: c.piece.box,
              label: c.piece.label,
            }))}
          />
        ) : model.data?.cell.imageUrl ? (
          <Image source={model.data.cell.imageUrl} alt={lookbook.figure.alt} aspect="4:5" />
        ) : (
          <Skeleton width="100%" height={320} />
        )}
        {reading ? (
          <View className="gap-3" accessibilityState={{ busy: true }}>
            <Eyebrow>{copy.reading.eyebrow}</Eyebrow>
            <Heading size="md">{`${copy.reading.title} ${copy.reading.aside}`}</Heading>
            <Skeleton width="100%" height={80} />
          </View>
        ) : null}
        {read.status === 'done' && !list.length ? <Text tone="muted">{copy.empty}</Text> : null}
        {onRack.map((card) => {
          const own = card.state.state === 'owned' ? mine.get(card.state.pieceId) : undefined;
          const label = own?.label ?? card.piece.label;
          return (
            <View
              key={card.piece.index}
              className="flex-row items-center gap-3 rounded-soft bg-surface p-2"
            >
              <Thumb own={own} piece={card.piece} photo={read.photo as ReadPhoto} />
              <View className="flex-1 gap-0.5">
                <Eyebrow>{own ? sheetOf(own) : sheetOf(card.piece)}</Eyebrow>
                <Text>{label}</Text>
                {card.state.state === 'new' ? (
                  <Text size="small" tone="muted">
                    {copy.newRow}
                  </Text>
                ) : null}
              </View>
              <IconButton
                icon="close"
                label={copy.remove(label)}
                onPress={() => answer(card.piece.index, { state: 'skip' })}
              />
            </View>
          );
        })}
        {pending.map((card) => {
          const own = card.piece.match ? mine.get(card.piece.match.pieceId) : undefined;
          const matched = !!card.piece.match;
          const label = own?.label ?? card.piece.label;
          const brand = (own ? own.brand : card.piece.brand)?.trim();
          return (
            <View
              key={card.piece.index}
              testID={`read-card-${card.piece.index}`}
              className="gap-3 rounded-soft border border-hairline p-3"
            >
              <View className="flex-row items-center gap-3">
                <View className="size-6 items-center justify-center rounded-pill bg-ink">
                  <Text size="caption" className="text-bg">
                    {String(card.piece.index + 1)}
                  </Text>
                </View>
                <Thumb own={own} piece={card.piece} photo={read.photo as ReadPhoto} />
                <View className="flex-1 gap-0.5">
                  <Eyebrow>
                    {`${own ? sheetOf(own) : sheetOf(card.piece)}${brand ? ` · ${brand}` : ''} · ${matched ? photoPieces.chip.check : photoPieces.chip.new}`}
                  </Eyebrow>
                  <Text>{label}</Text>
                  <Text size="small" tone="muted">
                    {matched
                      ? `${copy.ctxMatch(label)}${own?.image ? photoPieces.status.ownPhoto : ''}`
                      : copy.ctxNew}
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap items-center gap-2">
                <Text size="small" italic className="mr-auto">
                  {matched ? copy.askMatch(label) : copy.askNew}
                </Text>
                <Pill
                  onPress={() =>
                    answer(
                      card.piece.index,
                      card.piece.match
                        ? { state: 'owned', pieceId: card.piece.match.pieceId }
                        : { state: 'new' },
                    )
                  }
                >
                  {copy.yes}
                </Pill>
                <Pill onPress={() => setFinding(card.piece.index)}>{copy.find}</Pill>
                <Button variant="quiet" onPress={() => answer(card.piece.index, { state: 'skip' })}>
                  {copy.leaveOut}
                </Button>
              </View>
            </View>
          );
        })}
        {reading ? null : (
          <>
            <View className="flex-row items-center justify-between gap-3">
              <Text>{copy.wearToday}</Text>
              <Switch value={wear} onValueChange={setWear} accessibilityLabel={copy.wearToday} />
            </View>
            {error ? <ErrorText>{error}</ErrorText> : null}
          </>
        )}
      </ScrollView>
      {reading ? null : (
        <View className="absolute inset-x-0 bottom-0 flex-row items-center gap-3 border-hairline border-t bg-bg px-4 pt-3 pb-8">
          <Button variant="quiet" onPress={() => router.back()}>
            {lookbook.bar.discard}
          </Button>
          {pending.length ? (
            <Text size="small" tone="muted" className="flex-1 text-center">
              {copy.gate(pending.length)}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
          <PrimaryScope>
            <Button
              disabled={pending.length > 0}
              loading={saving}
              loadingLabel={copy.saving}
              onPress={() => void save()}
            >
              {copy.save}
            </Button>
          </PrimaryScope>
        </View>
      )}
      <Sheet
        open={!!findCard}
        onClose={closeFind}
        title={findCard ? copy.findTitle(findCard.piece.label) : undefined}
      >
        <View className="gap-4 pb-6">
          <ScrollView contentContainerClassName="flex-row flex-wrap gap-3">
            {options.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={p.label}
                accessibilityState={{ selected: chosen === p.id }}
                onPress={() => setChosen(p.id)}
                style={{ width: '30%' }}
                className={`gap-1 rounded-soft p-1 ${chosen === p.id ? 'border-2 border-ink' : 'border-2 border-transparent'}`}
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
          <PrimaryScope>
            <Button
              disabled={!pick}
              onPress={() => {
                if (pick && finding !== null) answer(finding, { state: 'owned', pieceId: pick.id });
                closeFind();
              }}
            >
              {pick ? copy.findGo(pick.label) : copy.findEmpty}
            </Button>
          </PrimaryScope>
          <Pill
            onPress={() => {
              if (finding !== null) answer(finding, { state: 'new' });
              closeFind();
            }}
          >
            {copy.findNone}
          </Pill>
        </View>
      </Sheet>
    </>
  );
}
