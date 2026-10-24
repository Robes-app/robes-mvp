import { useApi } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { looks as copy, errors, lookbook, ui } from '@robes/copy';
import { lookFacts, noteShort } from '@robes/core/looks';
import {
  Button,
  EmptyState,
  Eyebrow,
  Field,
  Heading,
  Image,
  Pill,
  PrimaryScope,
  Sheet,
  Skeleton,
  Text,
  useToast,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { dayLabel, usePinLook } from '@/features/plan/plan';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { LookPicture } from './LookPicture';
import { LookPromptBox } from './LookPromptBox';
import { useLookEditor } from './look-editor';
import { RackRowCard } from './RackRow';
import { SeeOnMe } from './SeeOnMe';
import { SwapSheet } from './SwapSheet';
import {
  localDate,
  nextDays,
  useRemoveLook,
  useRenameLook,
  useSaveAsNew,
  useShareLook,
  useShareToken,
  useStopSharing,
  useWearToday,
} from './saved-looks';

const DAY_CHOICES = 14;

// A provisional name is Robes' suggestion: she can keep it or name the look herself.
function Name({ look }: { look: Look }) {
  const rename = useRenameLook();
  const [name, setName] = useState(look.name);
  const dirty = name.trim() !== '' && name.trim() !== look.name;
  return (
    <View className="gap-3">
      <Heading>{look.name}</Heading>
      {look.nameProvisional ? (
        <View className="flex-row items-center gap-3">
          <Text size="small" tone="muted">
            {copy.look.suggested}
          </Text>
          <Button
            variant="quiet"
            onPress={() => rename.mutate({ params: { id: look.id }, input: { name: look.name } })}
          >
            {copy.look.keepName}
          </Button>
        </View>
      ) : null}
      <Field
        label={copy.look.nameLabel}
        value={name}
        onChangeText={setName}
        maxLength={120}
        returnKeyType="done"
      />
      {dirty ? (
        <Button
          variant="secondary"
          loading={rename.isPending}
          loadingLabel={ui.loading}
          onPress={() => rename.mutate({ params: { id: look.id }, input: { name: name.trim() } })}
        >
          {copy.look.saveName}
        </Button>
      ) : null}
    </View>
  );
}

function WearOnDay({ look, open, onClose }: { look: Look; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const pin = usePinLook();
  const days = nextDays(DAY_CHOICES);
  return (
    <Sheet open={open} onClose={onClose} title={copy.look.chooseDay}>
      <View className="flex-row flex-wrap gap-2 pb-6">
        {days.map((date) => (
          <Pill
            key={date}
            disabled={pin.isPending}
            onPress={() =>
              void pin
                .mutateAsync({ params: { id: look.id }, input: { dates: [date], slot: 'day' } })
                .then(() => {
                  toast.show({ message: copy.look.pinned });
                  onClose();
                })
                .catch(() => toast.show({ message: errors.internal }))
            }
          >
            {dayLabel(date, days[0])}
          </Pill>
        ))}
      </View>
    </Sheet>
  );
}

export function LookDetail({ id }: { id: string }) {
  // Follows a render on her model until it lands.
  const {
    data: look,
    isPending,
    isError,
    error,
  } = useApi(
    'looks.get',
    { params: { id } },
    {
      refetchInterval: (q) =>
        q.state.data?.onModel === 'pending' || q.state.data?.framePending ? 3_000 : false,
    },
  );
  if (isPending) return <Skeleton width="100%" aspectRatio={4 / 5} />;
  if (isError || !look) return <EmptyState title={errorMessage(error)} />;
  return <SavedLook look={look} />;
}

// The saved look (5a–5e): its rack read like the wardrobe, Edit look → Editing (Done · Update
// look), and the prompt box — a change made through it opens Editing.
function SavedLook({ look }: { look: Look }) {
  const router = useRouter();
  const wear = useWearToday();
  const remove = useRemoveLook();
  const saveAsNew = useSaveAsNew((newId) => router.push(`/look/${newId}`));
  const shareLook = useShareLook();
  const token = useShareToken(look.id);
  const stopSharing = useStopSharing(look.id);
  const [choosingDay, setChoosingDay] = useState(false);
  const editor = useLookEditor(look);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const woreToday = look.lastWornOn === localDate();
  const render = renditionUri(look.image, 360);
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const swapRow = editor.rack.rows.find((r) => r.key === swapping) ?? null;
  const meta = [lookbook.meta.saved(lookFacts(look, editor.rack.rows.length))];
  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-6 px-6 pb-32">
        {look.frame ? (
          <LookPicture look={look} />
        ) : render ? (
          <Image
            source={render}
            alt={copy.look.imageAlt(look.name)}
            blurhash={look.image?.blurhash}
          />
        ) : null}
        <View className="gap-2">
          <Eyebrow>{editor.editing ? lookbook.eyebrow.editing : lookbook.eyebrow.saved}</Eyebrow>
          <Name key={look.name} look={look} />
          <Text tone="muted">{copy.look.worn(look.timesWorn)}</Text>
          <Text size="small" tone="muted">
            {meta.join(' · ')}
          </Text>
          {look.note ? <Text>{noteShort(look.note)}</Text> : null}
        </View>
        <View className="gap-3">
          <Eyebrow>{lookbook.rack.title(editor.rack.rows.length)}</Eyebrow>
          {editor.rack.rows.length === 0 ? <Text tone="muted">{lookbook.rack.empty}</Text> : null}
          {editor.rack.rows.map((row) => (
            <RackRowCard
              key={row.key}
              row={row}
              image={row.pieceId ? piecesById.get(row.pieceId)?.image : null}
              mark={editor.mark(row.key)}
              styled={editor.rack.styling[row.key]}
              {...(row.pieceId ? { onOpen: () => router.push(`/piece/${row.pieceId}`) } : {})}
              {...(row.proposal ? { onWish: () => editor.wish(row.key) } : {})}
              {...(editor.editing
                ? { onSwap: () => setSwapping(row.key), onRemove: () => editor.remove(row.key) }
                : {})}
            />
          ))}
          {editor.editing ? (
            <Button variant="secondary" onPress={() => setAdding(true)}>
              {lookbook.rack.addPiece}
            </Button>
          ) : null}
        </View>
        {editor.rack.rows.length > 0 ? (
          <LookPromptBox
            lookId={look.id}
            name={look.name}
            surface="saved"
            rack={editor.rack}
            anchorPieceId={look.anchor?.id ?? null}
            changed={editor.changed}
            onAnswer={editor.answer}
          />
        ) : null}
        {editor.editing ? null : (
          <PrimaryScope>
            <View className="gap-3">
              <Button
                onPress={() =>
                  wear.mutate({ params: { id: look.id }, input: { wornOn: localDate() } })
                }
                disabled={woreToday}
                loading={wear.isPending}
              >
                {woreToday ? copy.look.woreToday : copy.look.wearToday}
              </Button>
              <Button variant="secondary" onPress={() => setChoosingDay(true)}>
                {copy.look.wearOnDay}
              </Button>
              {look.frame ? null : <SeeOnMe look={look} />}
              <Button
                variant="secondary"
                loading={shareLook.isPending}
                loadingLabel={ui.loading}
                onPress={() =>
                  shareLook.mutate({ input: { subjectType: 'look', subjectId: look.id } })
                }
              >
                {copy.look.share}
              </Button>
              {token ? (
                <Button
                  variant="quiet"
                  className="self-center"
                  onPress={() => stopSharing.mutate({ params: { token } })}
                >
                  {copy.look.stopSharing}
                </Button>
              ) : null}
              <Button
                variant="quiet"
                className="self-center"
                loading={saveAsNew.isPending}
                loadingLabel={ui.loading}
                onPress={() => saveAsNew.mutate({ params: { id: look.id }, input: {} })}
              >
                {copy.look.saveAsNew}
              </Button>
              <Button
                variant="quiet"
                icon="trash"
                className="self-center"
                onPress={() => {
                  remove.mutate({ params: { id: look.id } });
                  router.back();
                }}
              >
                {copy.result.remove}
              </Button>
            </View>
          </PrimaryScope>
        )}
        <WearOnDay look={look} open={choosingDay} onClose={() => setChoosingDay(false)} />
      </ScrollView>
      <View
        className="absolute inset-x-0 bottom-0 flex-row items-center justify-end gap-3 border-t border-hairline bg-bg px-6 py-3"
        testID="look-bar"
      >
        {editor.editing ? (
          <PrimaryScope>
            <Button variant="quiet" onPress={editor.discard}>
              {editor.dirty ? lookbook.bar.discard : lookbook.bar.done}
            </Button>
            <Button
              onPress={editor.update}
              disabled={!editor.dirty}
              loading={editor.saving}
              className="flex-1"
            >
              {lookbook.bar.update}
            </Button>
          </PrimaryScope>
        ) : (
          <Button variant="secondary" onPress={editor.startEditing}>
            {look.pieces.length || look.proposals.length
              ? lookbook.bar.editLook
              : lookbook.bar.addPieces}
          </Button>
        )}
      </View>
      <SwapSheet
        open={swapping !== null || adding}
        swapping={swapRow ? { name: swapRow.name, category: swapRow.category } : null}
        onRack={editor.rack.rows.flatMap((r) => (r.pieceId ? [r.pieceId] : []))}
        onClose={() => {
          setSwapping(null);
          setAdding(false);
        }}
        onPick={(piece) => (swapping ? editor.swap(swapping, piece) : editor.add(piece))}
      />
    </View>
  );
}
