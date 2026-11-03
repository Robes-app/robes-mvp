import { useApi } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { anchorName, isHandBuiltDraft, noteShort } from '@robes/core/looks';
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
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { Composer } from './Composer';
import { DiarySheet } from './DiarySheet';
import { GenericModelBadge } from './GenericModelBadge';
import { JOB_REFRESH_MS } from './ideas';
import { LookDetail } from './LookDetail';
import { LookPicture } from './LookPicture';
import { LookPromptBox } from './LookPromptBox';
import { LookVerdict } from './LookVerdict';
import { useLookEditor } from './look-editor';
import { useInvalidateLooks, useLetGo, useSaveLook } from './look-states';
import { RackRowCard } from './RackRow';
import { SwapSheet } from './SwapSheet';

// A look in whichever state it stands (docs/look-states-brief.md §3.2): one page, one bar.
export function LookScreen({ id }: { id: string }) {
  const query = useApi(
    'looks.get',
    { params: { id } },
    {
      refetchInterval: (q) =>
        q.state.data?.framePending || q.state.data?.onModel === 'pending' ? JOB_REFRESH_MS : false,
    },
  );
  // Save opens the diary every time; the sheet outlives the working page it was saved from.
  const [justSaved, setJustSaved] = useState<Look | null>(null);
  if (query.isPending) return <Skeleton width="100%" aspectRatio={4 / 5} />;
  if (query.isError || !query.data) return <EmptyState title={errorMessage(query.error)} />;
  const look = query.data;
  return (
    <>
      {isHandBuiltDraft(look) ? (
        // A draft she builds by hand stays in the composer until she saves it.
        <Composer look={look} onSaved={setJustSaved} />
      ) : look.status === 'saved' ? (
        <LookDetail id={id} />
      ) : (
        <WorkingLook look={look} onSaved={setJustSaved} />
      )}
      <DiarySheet look={justSaved} onClose={() => setJustSaved(null)} />
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
function WorkingLook({ look, onSaved }: { look: Look; onSaved: (look: Look) => void }) {
  const router = useRouter();
  const editor = useLookEditor(look);
  const refresh = useInvalidateLooks();
  const save = useSaveLook(onSaved, look.status === 'suggested' ? 'suggested' : 'draft');
  const letGo = useLetGo(look.status === 'draft' ? copy.discarded : copy.removed);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(look.nameProvisional ? '' : look.name);
  const suggested = look.status === 'suggested';
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const swapRow = editor.rack.rows.find((r) => r.key === swapping) ?? null;
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
          <Text size="small" tone="muted">
            {copy.meta.pieces(editor.rack.rows.length)}
          </Text>
        </View>
        {look.image || look.setId ? (
          <View>
            <LookPicture look={look} />
            {suggested && look.frame ? <GenericModelBadge /> : null}
          </View>
        ) : null}
        {look.note ? <Text>{noteShort(look.note)}</Text> : null}
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
              image={row.pieceId ? piecesById.get(row.pieceId)?.image : null}
              mark={editor.mark(row.key)}
              styled={editor.rack.styling[row.key]}
              {...(row.pieceId ? { onOpen: () => router.push(`/piece/${row.pieceId}`) } : {})}
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
            <Button variant="secondary" onPress={() => setAdding(true)}>
              {copy.rack.addPiece}
            </Button>
          )}
        </View>
        {editor.rack.rows.length > 0 ? (
          <LookPromptBox
            lookId={look.id}
            name={look.name}
            surface={suggested ? 'suggested' : 'draft'}
            rack={editor.rack}
            anchorPieceId={look.anchor?.id ?? null}
            changed={editor.changed}
            draft={!suggested}
            onAnswer={(result) => {
              editor.answer(result);
              if (suggested) refresh();
            }}
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
            <Button variant="secondary" onPress={() => editor.startDraft()} className="flex-1">
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
      <SwapSheet
        open={swapping !== null || adding}
        swapping={swapRow ? { name: swapRow.name, category: swapRow.category } : null}
        onRack={editor.rack.rows.flatMap((r) => (r.pieceId ? [r.pieceId] : []))}
        onClose={() => {
          setSwapping(null);
          setAdding(false);
        }}
        instant={suggested}
        onPick={(piece) =>
          swapping
            ? suggested
              ? editor.swapKeep(swapping, piece)
              : editor.swap(swapping, piece)
            : editor.add(piece)
        }
      />
    </View>
  );
}
