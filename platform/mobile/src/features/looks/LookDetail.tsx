import { useApi } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { looks as copy, lookbook, ui } from '@robes/copy';
import { lookFacts } from '@robes/core/looks';
import {
  Button,
  EmptyState,
  Eyebrow,
  Field,
  Heading,
  IconButton,
  MIN_TOUCH,
  PrimaryScope,
  Skeleton,
  Text,
  useColor,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { DiarySheet } from './DiarySheet';
import { LookHero } from './LookHero';
import { LookPromptBox } from './LookPromptBox';
import { useLookEditor } from './look-editor';
import { RackRowCard } from './RackRow';
import { SwapSheet } from './SwapSheet';
import { useRemoveLook, useRenameLook } from './saved-looks';
import { WearRecord } from './WearRecord';

// A provisional name is Robes' suggestion: she can keep it or name the look herself.
// The pencil sits on the name; the field only exists while she is changing it.
function Name({ look }: { look: Look }) {
  const rename = useRenameLook();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(look.name);
  const dirty = name.trim() !== '' && name.trim() !== look.name;
  if (editing) {
    return (
      <View className="gap-3">
        <Field
          label={copy.look.nameLabel}
          value={name}
          onChangeText={setName}
          maxLength={120}
          returnKeyType="done"
        />
        <View className="flex-row items-center gap-3">
          <Button
            variant="secondary"
            disabled={!dirty}
            loading={rename.isPending}
            loadingLabel={ui.loading}
            onPress={() => {
              rename.mutate({ params: { id: look.id }, input: { name: name.trim() } });
              setEditing(false);
            }}
          >
            {copy.look.saveName}
          </Button>
          <Button
            variant="quiet"
            onPress={() => {
              setName(look.name);
              setEditing(false);
            }}
          >
            {copy.page.cancel}
          </Button>
        </View>
      </View>
    );
  }
  // No "Robes’ suggestion · Keep this name": the pencil is how she renames (27 Oct).
  return (
    <View className="flex-row items-start gap-2">
      <Heading className="min-w-0 flex-1">{look.name}</Heading>
      <IconButton icon="pencil" label={copy.page.rename} onPress={() => setEditing(true)} />
    </View>
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
  const remove = useRemoveLook();
  const [diary, setDiary] = useState(false);
  const editor = useLookEditor(look);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // The deep rose: the brand's rose at a size small text can read (4.5:1).
  const rose = useColor('accent-warm');
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const swapRow = editor.rack.rows.find((r) => r.key === swapping) ?? null;
  const meta = lookbook.meta.saved(lookFacts(look, editor.rack.rows.length));
  return (
    <View className="flex-1">
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerClassName="gap-6 px-6 pb-32"
      >
        <LookHero
          look={look}
          eyebrow={editor.editing ? lookbook.eyebrow.editing : lookbook.eyebrow.saved}
          onDiary={() => setDiary(true)}
        />
        {/* The name and its one line of facts, close together; the eyebrow is over the picture. */}
        <View className="gap-1">
          <Name key={look.name} look={look} />
          {/* One line straight under the title; the picture's line carries the note. */}
          <Text size="small" tone="muted">
            {meta}
          </Text>
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
        {editor.editing ? null : <WearRecord look={look} onAddDate={() => setDiary(true)} />}
        {editor.editing ? null : (
          // Beta's foot: the record, then Delete this look. Wearing is the diary on the picture,
          // a new look the composer, her model You · Model (27 Oct; web twin look-view.tsx).
          <PrimaryScope>
            <View className="gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.page.remove}
                onPress={() => {
                  remove.mutate({ params: { id: look.id } });
                  router.back();
                }}
                style={{ minHeight: MIN_TOUCH }}
                className="items-center justify-center self-center"
              >
                <Text size="small" style={{ color: rose }}>
                  {copy.page.remove}
                </Text>
              </Pressable>
            </View>
          </PrimaryScope>
        )}
        <DiarySheet look={diary ? look : null} onClose={() => setDiary(false)} />
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
          // A small hairline pill in sentence case (beta's size).
          <Pressable
            accessibilityRole="button"
            onPress={editor.startEditing}
            hitSlop={4}
            className="min-h-9 justify-center rounded-pill border border-border-control px-4"
          >
            <Text size="small">
              {look.pieces.length || look.proposals.length
                ? lookbook.bar.editLook
                : lookbook.bar.addPieces}
            </Text>
          </Pressable>
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
