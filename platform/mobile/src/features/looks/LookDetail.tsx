import { useApi } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { looks as copy, lookbook } from '@robes/copy';
import { lookFacts, pinnedFor } from '@robes/core/looks';
import {
  AlertDialog,
  Button,
  EmptyState,
  FINE_EDGE,
  Heading,
  IconButton,
  InlineTitleField,
  MIN_TOUCH,
  PrimaryScope,
  Skeleton,
  Tabs,
  Text,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useBareScreen } from '@/components/StackScreen';
import { errorMessage } from '@/lib/errors';
import { AdjustDock } from './AdjustDock';
import { type Adjust, useAdjust } from './adjust';
import { DiarySheet } from './DiarySheet';
import { ImageManager } from './ImageManager';
import { LookDetails } from './LookDetails';
import { useLookEditor } from './look-editor';
import { PieceList } from './PieceList';
import { RackRowCard } from './RackRow';
import { SavedLookPhoto } from './SavedLook';
import { SeasonsView } from './SeasonsView';
import { SwapSheet } from './SwapSheet';
import { localDate, useRemoveLook, useRenameLook } from './saved-looks';
import { TagsView, useLookDetails } from './TagsView';
import { WornView } from './WornView';

const saved = lookbook.savedLook;
const TABS = [saved.tabs.pieces, saved.tabs.details] as const;
type Tab = (typeof TABS)[number];

// The pencil sits on the name; the title itself becomes the field while she changes it.
// Empty or unchanged keeps the name it had (a look is named). Web twin: look-view.tsx LookName.
function Name({ look }: { look: Look }) {
  const rename = useRenameLook();
  const [editing, setEditing] = useState(false);
  // No "Robes’ suggestion · Keep this name": the pencil is how she renames (27 Oct).
  return (
    <View className="flex-row items-start gap-2">
      {editing ? (
        <InlineTitleField
          value={look.name}
          label={copy.look.nameLabel}
          required
          onCommit={(next) => {
            setEditing(false);
            if (next !== look.name) {
              rename.mutate({ params: { id: look.id }, input: { name: next } });
            }
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <Heading className="min-w-0 flex-1">{look.name}</Heading>
          <IconButton icon="pencil" label={copy.page.rename} onPress={() => setEditing(true)} />
        </>
      )}
    </View>
  );
}

// `edit`: opened from home's Edit disc, so the look opens in Editing.
export function LookDetail({ id, edit = false }: { id: string; edit?: boolean }) {
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
  return <SavedLook look={look} edit={edit} />;
}

// The saved look as Felix 3e (D8, D9, D10): the photo with its discs, the name, Pieces · Details,
// and one Schedule look at the foot. Editing (Edit look, or `edit` from Home) turns the piece
// list into its edit mode with Done · Update look at the foot and Delete as a reveal (D9).
// Web twin: app/(app)/look/[id]/look-view.tsx LookBody.
function SavedLook({ look, edit }: { look: Look; edit: boolean }) {
  // The photo starts under the status bar and carries its own back disc (Felix 3e).
  useBareScreen();
  const router = useRouter();
  const remove = useRemoveLook();
  const update = useLookDetails(look);
  const [diary, setDiary] = useState(false);
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [managing, setManaging] = useState(false);
  const [subview, setSubview] = useState<'tags' | 'seasons' | 'worn' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const adjustRef = useRef<Adjust | null>(null);
  const editor = useLookEditor(look, { onChange: () => adjustRef.current?.changed() });
  const opened = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on the look's first open
  useEffect(() => {
    if (edit && !opened.current) {
      opened.current = true;
      editor.startEditing();
    }
  }, [edit]);
  const adjust = useAdjust(look, editor, 'saved');
  adjustRef.current = adjust;
  const [swapping, setSwapping] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const swapRow = editor.rack.rows.find((r) => r.key === swapping) ?? null;
  // The web twin is savedMeta in look-page.tsx.
  const meta = lookbook.meta.saved({
    ...lookFacts(look, editor.rack.rows.length),
    pinnedFor: pinnedFor(look.pinnedOn, localDate()),
  });
  const onDelete = () => {
    setConfirmDelete(false);
    remove.mutate({ params: { id: look.id } });
    router.back();
  };
  return (
    <View className="flex-1">
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerClassName="pb-36"
      >
        {managing ? (
          <ImageManager look={look} onDone={() => setManaging(false)} />
        ) : (
          <SavedLookPhoto
            look={look}
            onAdjust={() => setDockOpen(true)}
            onImages={() => setManaging(true)}
          />
        )}
        <View className="gap-3 px-5 pt-4">
          {/* The name and its one line of facts, close together. */}
          <View className="gap-1">
            <Name key={look.name} look={look} />
            <Text size="small" tone="muted">
              {meta}
            </Text>
          </View>
          <Tabs items={TABS} value={tab} onChange={setTab} testID="look-tabs" />
          {tab === TABS[0] ? (
            <View className="gap-4" testID="pieces-tab">
              {editor.editing ? null : (
                <View className="flex-row justify-end">
                  <Button variant="chip" onPress={editor.startEditing}>
                    {look.pieces.length || look.proposals.length
                      ? saved.edit
                      : lookbook.bar.addPieces}
                  </Button>
                </View>
              )}
              <PieceList
                {...(editor.editing ? { onAdd: () => setAdding(true) } : {})}
                empty={
                  editor.rack.rows.length === 0 && !editor.editing ? (
                    <Text tone="muted" className="pt-3">
                      {lookbook.rack.empty}
                    </Text>
                  ) : null
                }
              >
                {editor.rack.rows.map((row, i) => (
                  <View
                    key={row.key}
                    className="border-hairline"
                    style={{ borderTopWidth: i === 0 ? 0 : FINE_EDGE }}
                  >
                    <RackRowCard
                      row={row}
                      image={row.pieceId ? piecesById.get(row.pieceId)?.image : null}
                      mark={editor.mark(row.key)}
                      styled={editor.rack.styling[row.key]}
                      {...(!editor.editing && row.pieceId
                        ? { wears: piecesById.get(row.pieceId)?.wearCount ?? 0 }
                        : {})}
                      {...(row.pieceId
                        ? { onOpen: () => router.push(`/piece/${row.pieceId}`) }
                        : {})}
                      {...(row.proposal ? { onWish: () => editor.wish(row.key) } : {})}
                      {...(editor.editing
                        ? {
                            onSwap: () => setSwapping(row.key),
                            onRemove: () => editor.remove(row.key),
                          }
                        : {})}
                    />
                  </View>
                ))}
              </PieceList>
              {editor.rack.rows.length > 0 ? (
                <AdjustDock
                  adjust={adjust}
                  name={look.name}
                  surface="saved"
                  open={dockOpen}
                  onOpenChange={setDockOpen}
                />
              ) : null}
              {editor.editing ? (
                // Delete lives in Editing (D9): a destructive reveal, asked before it runs.
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.page.remove}
                  onPress={() => setConfirmDelete(true)}
                  style={{ minHeight: MIN_TOUCH }}
                  className="items-center justify-center self-start"
                >
                  <Text size="small" tone="danger">
                    {copy.page.remove}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <LookDetails
              look={look}
              onTags={() => setSubview('tags')}
              onSeasons={() => setSubview('seasons')}
              onWorn={() => setSubview('worn')}
              onCaption={(note) => update.mutate({ params: { id: look.id }, input: { note } })}
            />
          )}
        </View>
      </ScrollView>
      {/* The look's one bar, held at the foot: Schedule look, or Done · Update look while she works. */}
      <View
        className="absolute inset-x-0 bottom-0 flex-row items-center justify-end gap-3 border-hairline bg-bg px-5 pt-3"
        style={{ borderTopWidth: FINE_EDGE, paddingBottom: 22 }}
        testID="look-bar"
      >
        {editor.editing ? (
          <PrimaryScope>
            <Button variant="quiet" onPress={editor.discard}>
              {editor.dirty ? lookbook.bar.discard : lookbook.bar.done}
            </Button>
            <Button
              onPress={() =>
                void editor.update().then((ok) => {
                  if (ok) adjust.drawForSave();
                })
              }
              disabled={!editor.dirty && !adjust.stale}
              loading={editor.saving}
              className="flex-1"
            >
              {adjust.stale ? `↻ ${lookbook.bar.update}` : lookbook.bar.update}
            </Button>
          </PrimaryScope>
        ) : (
          <PrimaryScope>
            <Button onPress={() => setDiary(true)} className="flex-1" testID="schedule-look">
              {saved.schedule}
            </Button>
          </PrimaryScope>
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
        // One tap swaps while she edits, behind a 6 s Undo (web twin: Rack in look-page.tsx).
        instant
        onPick={(piece) => (swapping ? editor.swap(swapping, piece) : editor.add(piece))}
      />
      <TagsView look={look} open={subview === 'tags'} onBack={() => setSubview(null)} />
      <SeasonsView look={look} open={subview === 'seasons'} onBack={() => setSubview(null)} />
      <WornView
        look={look}
        open={subview === 'worn'}
        onBack={() => setSubview(null)}
        onAddDate={() => {
          setSubview(null);
          setDiary(true);
        }}
      />
      <AlertDialog
        open={confirmDelete}
        title={saved.deleteTitle}
        message={saved.deleteBody}
        actions={[
          { label: saved.delete, variant: 'primary', onPress: onDelete },
          { label: saved.keep, variant: 'outline', onPress: () => setConfirmDelete(false) },
        ]}
        onDismiss={() => setConfirmDelete(false)}
      />
      <DiarySheet look={diary ? look : null} onClose={() => setDiary(false)} />
    </View>
  );
}
