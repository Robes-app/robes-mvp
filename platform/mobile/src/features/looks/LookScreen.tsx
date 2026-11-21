import { useApi } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook as copy, ui } from '@robes/copy';
import { anchorName, noteShort, pictureLanding } from '@robes/core/looks';
import {
  Button,
  EmptyState,
  Eyebrow,
  Heading,
  InlineTitleField,
  PrimaryScope,
  Skeleton,
  Text,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AddPiecesSheet } from '@/features/wardrobe/add/AddPiecesSheet';
import { useWishOf } from '@/features/wardrobe/wishlist';
import { errorMessage } from '@/lib/errors';
import { AdjustDock } from './AdjustDock';
import { type Adjust, useAdjust } from './adjust';
import { DraftLook } from './DraftLook';
import { JOB_REFRESH_MS } from './ideas';
import { LookMix, LookPicture } from './LookPicture';
import { LookVerdict } from './LookVerdict';
import { onRackIds, useLookEditor } from './look-editor';
import { useLetGo, useSaveLook } from './look-states';
import { type PickerMode, PiecePicker } from './PiecePicker';
import { RackRowCard } from './RackRow';
import { RobesModelBadge } from './RobesModelBadge';

// A look in whichever state it stands (docs/look-states-brief.md §3.2): one page, one bar.
export function LookScreen({
  id,
  schedule = false,
}: {
  id: string;
  // `?schedule=1`: the look opens with the diary up.
  schedule?: boolean;
}) {
  const router = useRouter();
  const query = useApi(
    'looks.get',
    { params: { id } },
    {
      // Until the picture has landed, renditions and all (pictureLanding).
      refetchInterval: (q) => (pictureLanding(q.state.data) ? JOB_REFRESH_MS : false),
    },
  );
  if (query.isPending) return <Skeleton width="100%" aspectRatio={4 / 5} />;
  if (query.isError || !query.data) {
    // Audit F5: an error is never a dead end.
    return (
      <EmptyState
        title={errorMessage(query.error)}
        action={{ label: ui.retry, onPress: () => void query.refetch() }}
      />
    );
  }
  const look = query.data;
  return (
    <>
      {look.status === 'draft' ? (
        // Every draft is the one DraftLook (D14): on its page here, a sheet from the app's screens.
        <DraftLook
          id={look.id}
          presentation="page"
          onClose={() => (router.canGoBack() ? router.back() : router.replace('/looks'))}
        />
      ) : look.status === 'saved' ? (
        // A saved look edits in place (Felix 3e, D17): the same DraftLook as Home's Edit look
        // sheet, on its own page. Web twin: app/(app)/look/[id]/look-view.tsx.
        <DraftLook
          id={look.id}
          presentation="saved"
          schedule={schedule}
          onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      ) : (
        // Saved, it becomes the saved look here, diary closed until Schedule look (20 Nov).
        <WorkingLook look={look} />
      )}
    </>
  );
}

function eyebrowOf(look: Look): string {
  const around = look.anchor ? anchorName(look.anchor.label, look.anchor.brand) : '';
  if (look.status === 'suggested') {
    return around
      ? copy.eyebrow.suggestedAround(around)
      : look.setId
        ? copy.eyebrow.suggestedPrompt
        : copy.eyebrow.suggested;
  }
  return look.setId ? copy.eyebrow.draftFromSuggestion : copy.eyebrow.draft;
}

// Suggested (F8) and draft (F9 / 4d): the rack, the prompt box and one bar.
function WorkingLook({ look }: { look: Look }) {
  const router = useRouter();
  const adjustRef = useRef<Adjust | null>(null);
  const editor = useLookEditor(look, { onChange: () => adjustRef.current?.changed() });
  const adjust = useAdjust(look, editor, look.status === 'suggested' ? 'suggested' : 'draft');
  adjustRef.current = adjust;
  const save = useSaveLook(undefined, look.status === 'suggested' ? 'suggested' : 'draft');
  const letGo = useLetGo(look.status === 'draft' ? copy.discarded : copy.removed);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addingPieces, setAddingPieces] = useState(false);
  const [name, setName] = useState(look.nameProvisional ? '' : look.name);
  const suggested = look.status === 'suggested';
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const wishOf = useWishOf();
  const swapRow = editor.rack.rows.find((r) => r.key === swapping) ?? null;
  // One picker for every + and every swap (plan 2026-11-09 PR 9: the older swap sheet is gone).
  const picker: PickerMode | null =
    swapping && swapRow
      ? { swap: { key: swapping, name: swapRow.name, category: swapRow.category } }
      : adding
        ? { add: true }
        : null;
  const hasAny = editor.rack.rows.length > 0 || look.image !== null;
  return (
    <View className="flex-1">
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerClassName="gap-6 px-6 pb-40"
      >
        <View className="items-center gap-2">
          <Eyebrow>{eyebrowOf(look)}</Eyebrow>
          {suggested ? (
            <Heading className="text-center">{look.name}</Heading>
          ) : (
            // The title is the name, as in the composer: tap it and write over it.
            // Web twin: look-page.tsx WorkingLook.
            <InlineTitleField
              value={name}
              label={copy.name.label}
              placeholder={look.name || copy.name.placeholder}
              size={36}
              align="center"
              autoFocus={false}
              onChange={setName}
              onCommit={(next) => {
                if (next && next !== look.name) editor.rename(next);
              }}
              onCancel={() => setName(look.nameProvisional ? '' : look.name)}
            />
          )}
        </View>
        {look.image || look.setId ? (
          <View className="gap-3">
            <LookMix
              yours={editor.rack.rows.filter((r) => r.pieceId).length}
              toFind={editor.rack.rows.filter((r) => r.proposal).length}
              composed={look.composedByRobes}
            />
            <View>
              <LookPicture look={look} />
              <RobesModelBadge look={look} />
            </View>
          </View>
        ) : null}
        {look.note ? (
          <Text italic tone="muted" style={{ fontSize: 17 }}>
            {noteShort(look.note)}
          </Text>
        ) : null}
        <View className="gap-3">
          <Eyebrow>{copy.rack.title(editor.rack.rows.length)}</Eyebrow>
          {editor.rack.rows.length === 0 ? (
            <View className="gap-1 rounded-soft border border-dashed border-border-control p-4">
              <Text>{copy.guide.title}</Text>
              <Text size="small" tone="muted">
                {copy.guide.body}
              </Text>
              <Text size="small" tone="faint">
                {copy.guide.hint}
              </Text>
            </View>
          ) : null}
          {editor.rack.rows.map((row) => (
            <RackRowCard
              key={row.key}
              row={row}
              image={
                row.pieceId
                  ? piecesById.get(row.pieceId)?.image
                  : (wishOf(row.proposal?.wishlistItemId)?.image ?? null)
              }
              mark={editor.mark(row.key)}
              styled={editor.rack.styling[row.key]}
              {...(row.pieceId
                ? { onOpen: () => router.push(`/piece/${row.pieceId}`) }
                : wishOf(row.proposal?.wishlistItemId)
                  ? {
                      onOpen: () =>
                        router.push({
                          pathname: '/wish/[id]',
                          params: { id: row.proposal?.wishlistItemId ?? '' },
                        }),
                    }
                  : {})}
              {...(row.proposal ? { onWish: () => editor.wish(row.key) } : {})}
              {...(suggested
                ? { onSwap: () => setSwapping(row.key) }
                : {
                    onSwap: () => setSwapping(row.key),
                    onRemove: () => editor.remove(row.key),
                  })}
            />
          ))}
          {suggested ? null : (
            <Button variant="outline" onPress={() => setAdding(true)}>
              {copy.rack.addPiece}
            </Button>
          )}
        </View>
        {editor.rack.rows.length > 0 ? (
          <AdjustDock
            adjust={adjust}
            name={look.name}
            surface={suggested ? 'suggested' : 'draft'}
          />
        ) : null}
        {suggested ? (
          <LookVerdict
            look={look}
            onLetGo={() => {
              letGo(look.id);
              router.back();
            }}
          />
        ) : null}
        {suggested ? (
          <Button
            variant="quiet"
            className="self-center"
            onPress={() => {
              letGo(look.id);
              router.back();
            }}
          >
            {copy.bar.notForYou}
          </Button>
        ) : null}
      </ScrollView>
      <View
        className="absolute inset-x-0 bottom-0 flex-row items-center justify-between gap-3 border-t border-hairline bg-bg px-6 py-3"
        testID="look-bar"
      >
        <PrimaryScope>
          {suggested ? (
            <Button variant="outline" onPress={() => editor.startDraft()} className="flex-1">
              {copy.bar.edit}
            </Button>
          ) : (
            <Button
              variant="quiet"
              onPress={() => {
                letGo(look.id);
                router.back();
              }}
            >
              {copy.bar.discard}
            </Button>
          )}
          <Button
            onPress={() =>
              save.mutate({
                params: { id: look.id },
                input: name.trim() && name.trim() !== look.name ? { name: name.trim() } : {},
              })
            }
            disabled={!hasAny}
            loading={save.isPending}
            className="flex-1"
          >
            {suggested ? copy.bar.saveToLookbook : copy.bar.save}
          </Button>
        </PrimaryScope>
      </View>
      <PiecePicker
        mode={picker}
        onRack={onRackIds(editor.rack.rows)}
        onClose={() => {
          setSwapping(null);
          setAdding(false);
        }}
        onPick={(pieces, wishes) => {
          if (swapping) {
            // One of her pieces, or a wish from the WISHLIST tab as a piece to find.
            const [piece] = pieces;
            const [wish] = wishes;
            const into = piece ? { piece } : wish ? { wish } : null;
            if (!into) return;
            // A suggestion's swap keeps the look's picture (↻ redraws it), behind an Undo.
            if (suggested) editor.swapKeep(swapping, into);
            else editor.swap(swapping, into);
            return;
          }
          editor.addAll(pieces, wishes);
        }}
        onAddPieces={() => setAddingPieces(true)}
      />
      <AddPiecesSheet open={addingPieces} onClose={() => setAddingPieces(false)} />
    </View>
  );
}
