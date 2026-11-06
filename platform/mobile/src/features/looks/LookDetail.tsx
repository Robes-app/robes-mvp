import { useApi } from '@robes/api-client/react';
import { type Look, rackFromLook } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import {
  Button,
  EmptyState,
  FINE_EDGE,
  PrimaryScope,
  Skeleton,
  Tabs,
  Text,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useBareScreen } from '@/components/StackScreen';
import { errorMessage } from '@/lib/errors';
import { DiarySheet } from './DiarySheet';
import { ImageManager } from './ImageManager';
import { LookDetails } from './LookDetails';
import { PieceList } from './PieceList';
import { RackRowCard } from './RackRow';
import { SavedLookPhoto } from './SavedLook';
import { SeasonsView } from './SeasonsView';
import { TagsView, useLookDetails } from './TagsView';
import { WornView } from './WornView';

const saved = lookbook.savedLook;
const TABS = [saved.tabs.pieces, saved.tabs.details] as const;
type Tab = (typeof TABS)[number];

// `edit`: opened from home's Edit disc (Felix 3k), so the look opens its edit sheet; `schedule`:
// a draft just saved from its sheet opens with the diary up.
export function LookDetail({
  id,
  edit = false,
  schedule = false,
}: {
  id: string;
  edit?: boolean;
  schedule?: boolean;
}) {
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
  return <SavedLook look={look} edit={edit} schedule={schedule} />;
}

// The saved look as Felix 3e (D8, D9, D10): the photo with its discs, the name, Pieces · Details,
// and one Schedule look at the foot. Edit look, the adjust disc and `edit` from Home open the
// draft sheet in edit mode (D14), where the rack is worked and Delete lives (D9). Web twin:
// app/(app)/look/[id]/look-view.tsx LookBody.
function SavedLook({ look, edit, schedule }: { look: Look; edit: boolean; schedule: boolean }) {
  // The photo starts under the status bar and carries its own back disc (Felix 3e).
  useBareScreen();
  const router = useRouter();
  const update = useLookDetails(look);
  const [diary, setDiary] = useState(schedule);
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [managing, setManaging] = useState(false);
  const [subview, setSubview] = useState<'tags' | 'seasons' | 'worn' | null>(null);
  const draft = (sheet?: 'adjust') =>
    router.push(`/looks/draft/${look.id}${sheet ? `?sheet=${sheet}` : ''}`);
  const opened = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on the look's first open
  useEffect(() => {
    if (edit && !opened.current) {
      opened.current = true;
      draft();
    }
  }, [edit]);
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const rows = rackFromLook(look).rows;
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
            onAdjust={() => draft('adjust')}
            onImages={() => setManaging(true)}
          />
        )}
        <View className="gap-3 px-5 pt-4">
          {/* The name is the Caption in Details (D16): nothing stands between the photo and the tabs. */}
          <Tabs items={TABS} value={tab} onChange={setTab} testID="look-tabs" />
          {tab === TABS[0] ? (
            <View className="gap-4" testID="pieces-tab">
              <View className="flex-row justify-end">
                <Button variant="chip" onPress={() => draft()} testID="edit-look">
                  {look.pieces.length || look.proposals.length
                    ? saved.edit
                    : lookbook.bar.addPieces}
                </Button>
              </View>
              <PieceList
                empty={
                  rows.length === 0 ? (
                    <Text tone="muted" className="pt-3">
                      {lookbook.rack.empty}
                    </Text>
                  ) : null
                }
              >
                {rows.map((row, i) => (
                  <View
                    key={row.key}
                    className="border-hairline"
                    style={{ borderTopWidth: i === 0 ? 0 : FINE_EDGE }}
                  >
                    <RackRowCard
                      row={row}
                      image={row.pieceId ? piecesById.get(row.pieceId)?.image : null}
                      styled={look.styling[row.key]}
                      {...(row.pieceId
                        ? {
                            wears: piecesById.get(row.pieceId)?.wearCount ?? 0,
                            onOpen: () => router.push(`/piece/${row.pieceId}`),
                          }
                        : {})}
                    />
                  </View>
                ))}
              </PieceList>
            </View>
          ) : (
            <LookDetails
              look={look}
              onTags={() => setSubview('tags')}
              onSeasons={() => setSubview('seasons')}
              onWorn={() => setSubview('worn')}
              onCaption={(name) => update.mutate({ params: { id: look.id }, input: { name } })}
            />
          )}
        </View>
      </ScrollView>
      {/* The look's one bar, held at the foot: Schedule look. */}
      <View
        className="absolute inset-x-0 bottom-0 flex-row items-center justify-end gap-3 border-hairline bg-bg px-5 pt-3"
        style={{ borderTopWidth: FINE_EDGE, paddingBottom: 22 }}
        testID="look-bar"
      >
        <PrimaryScope>
          <Button onPress={() => setDiary(true)} className="flex-1" testID="schedule-look">
            {saved.schedule}
          </Button>
        </PrimaryScope>
      </View>
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
      <DiarySheet look={diary ? look : null} onClose={() => setDiary(false)} />
    </View>
  );
}
