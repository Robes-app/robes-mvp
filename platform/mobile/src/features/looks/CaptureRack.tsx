import { useApi, useApiClient } from '@robes/api-client/react';
import type { Look, Piece, PieceValues, ReadPiece, UpdatePieceInput } from '@robes/contracts';
import { lookbook, wardrobe } from '@robes/copy';
import { sheetL1For } from '@robes/core';
import {
  fileEdits,
  type RowChanges,
  readDraft,
  rowChanges,
  withTagDefaults,
} from '@robes/core/add-flow';
import { captureEyebrow, type RackRow } from '@robes/core/looks';
import { Icon, type IconName } from '@robes/icons/native';
import { shadowNative } from '@robes/tokens';
import {
  Button,
  ErrorText,
  FINE_EDGE,
  fonts,
  Image,
  PrimaryScope,
  Subview,
  Tabs,
  Text,
  useColor,
} from '@robes/ui-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text as RNText, View } from 'react-native';
import { CardRow } from '@/features/wardrobe/PieceCard';
import { type PieceField, PieceFieldSheet } from '@/features/wardrobe/PieceFieldSheet';
import { PieceRow, RecordRows, type RecordTab } from '@/features/wardrobe/PieceRows';
import { renditionUri } from '@/lib/images';
import type { CaptureRack } from './capture-rack';
import { DashedCard } from './RackCard';

const copy = lookbook.draftLook.capture;

const sheetOf = (row: Pick<RackRow, 'category' | 'categoryL2'>) =>
  (row.categoryL2 && sheetL1For(row.categoryL2)) || row.category;

// A found row's action: a 32pt cream disc in a 44pt target; the label is its accessible name.
function RowDisc({
  icon,
  label,
  faint = false,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  faint?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const ink = useColor(faint ? 'ink-faint' : 'ink');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      className="items-center justify-center"
      style={{ width: 38, height: 44 }}
      hitSlop={{ top: 0, bottom: 0, left: 3, right: 3 }}
    >
      <View
        className="items-center justify-center rounded-pill bg-surface-sunk"
        style={{ width: 32, height: 32 }}
      >
        <Icon name={icon} size={14} color={ink} />
      </View>
    </Pressable>
  );
}

// The Rack's heading on a look from her photograph: the serif title, and what Robes is doing.
function Head({ status }: { status?: string }) {
  return (
    <View className="h-7 flex-row items-center gap-2">
      <Text
        accessibilityRole="header"
        className="flex-1 text-ink-faint"
        style={{ fontFamily: fonts.displayRegular, fontSize: 17, letterSpacing: 0.16 }}
      >
        {lookbook.draftLook.rack}
      </Text>
      {status ? (
        <RNText
          accessibilityLiveRegion="polite"
          className="text-ink-faint"
          style={{ fontFamily: fonts.sans, fontSize: 12 }}
        >
          {status}
        </RNText>
      ) : null}
    </View>
  );
}

// A piece found in her photograph, not filed yet (Capture PRD 1c.6): the shared piece row with
// the crop, CATEGORY · COLOUR · MATERIAL, the name, and Match to piece · Add piece · Remove. When
// Robes sees one of hers in it, "Looks like your …" sits under a hairline with its one-tap Match;
// otherwise the row says there is no close match. Web twin: components/looks/capture-rack.tsx.
export function CaptureRow({
  row,
  look,
  capture,
  onMatch,
  onAdd,
}: {
  row: RackRow;
  look: Look;
  capture: CaptureRack;
  onMatch: () => void;
  onAdd: () => void;
}) {
  const hers = capture.suggested(row);
  const hersUri = renditionUri(hers?.image, 28);
  const [, ...said] = captureEyebrow(row, '').split(' · ').filter(Boolean);
  return (
    <CardRow
      testID={`capture-row-${row.key}`}
      piece={{
        id: row.key,
        label: row.name,
        category: row.category,
        categoryL2: row.categoryL2 ?? null,
        brand: null,
        image: look.captureImages[row.key] ?? null,
      }}
      {...(said.length ? { role: said.join(' · ') } : {})}
      maker={hers ? '' : copy.row.noMatch}
      action={
        <View className="flex-row items-center" style={{ marginRight: -6 }}>
          <RowDisc
            icon="wardrobe"
            label={copy.row.match}
            onPress={onMatch}
            testID={`capture-match-${row.key}`}
          />
          <RowDisc
            icon="plus"
            label={copy.row.add}
            onPress={onAdd}
            testID={`capture-add-${row.key}`}
          />
          <RowDisc
            icon="close"
            label={copy.row.remove}
            faint
            onPress={() => capture.remove(row.key)}
            testID={`capture-remove-${row.key}`}
          />
        </View>
      }
      below={
        hers ? (
          <View className="flex-row items-center gap-2.5">
            <View
              className="overflow-hidden bg-surface-sunk"
              style={{ width: 28, height: 35, borderRadius: 2 }}
            >
              {hersUri ? <Image source={hersUri} alt="" aspect="4:5" contentFit="cover" /> : null}
            </View>
            <View className="flex-1" style={{ gap: 2 }}>
              <RNText className="text-ink-faint" style={{ fontFamily: fonts.sans, fontSize: 10.5 }}>
                {copy.row.looksLike}
              </RNText>
              <RNText
                numberOfLines={1}
                className="text-ink"
                style={{ fontFamily: fonts.sans, fontSize: 12.5 }}
              >
                {hers.label}
              </RNText>
            </View>
            <View style={{ marginRight: -6 }}>
              <RowDisc
                icon="check"
                label={copy.row.quick}
                onPress={() => capture.match(row.key, hers, 'suggested')}
                testID={`capture-quick-match-${row.key}`}
              />
            </View>
          </View>
        ) : null
      }
    />
  );
}

// "2 pieces removed · Undo" under the list: Undo puts every removed row back (1c.6).
export function RemovedLine({ capture }: { capture: CaptureRack }) {
  if (!capture.removed) return null;
  return (
    <View className="flex-row items-center justify-center gap-2">
      <RNText
        accessibilityLiveRegion="polite"
        className="text-ink-faint"
        style={{ fontFamily: fonts.sans, fontSize: 12 }}
      >
        {copy.removed(capture.removed)}
      </RNText>
      <Pressable
        accessibilityRole="button"
        onPress={capture.undo}
        testID="capture-undo"
        className="min-h-11 justify-center"
      >
        <RNText
          className="text-ink-muted"
          style={{ fontFamily: fonts.sans, fontSize: 12, textDecorationLine: 'underline' }}
        >
          {copy.undo}
        </RNText>
      </Pressable>
    </View>
  );
}

// One skeleton row while Robes reads the photo: the thumb block and two bars, breathing.
function FindingRow({ width, delay }: { width: `${number}%`; delay: number }) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, delay, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity]);
  return (
    <Animated.View
      className="flex-row items-center gap-3 overflow-hidden rounded-[3px] bg-surface-raised"
      style={{ height: 65, opacity, ...shadowNative.row }}
    >
      <View className="self-stretch bg-surface-sunk" style={{ width: 52 }} />
      <View className="flex-1" style={{ gap: 9 }}>
        <View className="bg-surface-sunk" style={{ width: 44, height: 7, borderRadius: 2 }} />
        <View className="bg-surface-sunk" style={{ width, height: 11, borderRadius: 2 }} />
      </View>
    </Animated.View>
  );
}

// The Pieces tab of a look from her photograph (Capture PRD 1c.3–1c.6; canvas 1c): the dashed
// Find the pieces card with "Skip, keep just the photo", the skeleton rows while Robes reads, the
// rack once it has, and the photo kept when there is nothing left on it. `children` are the rows.
export function CapturePieces({
  look,
  capture,
  children,
}: {
  look: Look;
  capture: CaptureRack;
  children: ReactNode;
}) {
  const { stage } = capture;
  const photo = renditionUri(look.photo, 52);
  const card = (sub: string) => (
    <DashedCard
      eyebrow={copy.card.eyebrow}
      title={copy.card.title}
      sub={sub}
      icon="forward"
      photo={photo}
      onPress={capture.find}
      testID="capture-find"
    />
  );
  return (
    <View className="gap-2.5 pt-2" testID={`capture-rack-${stage}`}>
      <Head {...(stage === 'finding' ? { status: copy.finding } : {})} />
      {stage === 'ask' ? (
        <>
          {card(copy.card.sub)}
          <Pressable
            accessibilityRole="button"
            onPress={capture.skip}
            testID="capture-skip"
            className="min-h-11 justify-center self-center"
          >
            <RNText
              className="text-ink-faint"
              style={{ fontFamily: fonts.sans, fontSize: 12, textDecorationLine: 'underline' }}
            >
              {copy.card.skip}
            </RNText>
          </Pressable>
        </>
      ) : null}
      {stage === 'photo' ? card(copy.card.later) : null}
      {stage === 'finding' ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="gap-2.5"
        >
          <FindingRow width="58%" delay={0} />
          <FindingRow width="44%" delay={180} />
          <FindingRow width="52%" delay={360} />
        </View>
      ) : null}
      {stage === 'failed' ? (
        <>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <ErrorText>{capture.nothing ? copy.nothing : copy.failed}</ErrorText>
            </View>
            <Button variant="outline" onPress={capture.find} testID="capture-retry">
              {copy.retry}
            </Button>
          </View>
          {card(copy.card.later)}
        </>
      ) : null}
      {stage === 'rack' ? <View className="gap-2.5">{children}</View> : null}
      {stage === 'clear' ? (
        <View
          className="rounded-card border-rule-mid bg-surface-raised"
          style={{ borderWidth: FINE_EDGE, paddingHorizontal: 20, paddingVertical: 18 }}
        >
          <RNText
            className="text-ink-muted"
            style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 19.5 }}
          >
            {copy.clear}
          </RNText>
        </View>
      ) : null}
      <RemovedLine capture={capture} />
    </View>
  );
}

const TABS = [
  wardrobe.piece.tabs.piece,
  wardrobe.piece.tabs.colour,
  wardrobe.piece.tabs.wearing,
] as const;
type TabLabel = (typeof TABS)[number];
const TAB_OF: Record<TabLabel, RecordTab> = {
  [wardrobe.piece.tabs.piece]: 'piece',
  [wardrobe.piece.tabs.colour]: 'colour',
  [wardrobe.piece.tabs.wearing]: 'wearing',
};

// The new-piece review (Capture PRD 1c.8): the found piece on its own page before it files — its
// crop, then PIECE · COLOUR · WEARING as the piece page draws them, every value Robes' read and
// hers to change. ADD TO WARDROBE files it once with her edits and hands the piece back to the
// rack. Web twin: components/looks/capture-rack.tsx NewPieceSheet.
export function NewPieceSheet({
  row,
  look,
  capture,
  onClose,
  onAdded,
}: {
  // The found row being added; null closes the sheet.
  row: RackRow | null;
  look: Look;
  capture: CaptureRack;
  onClose: () => void;
  onAdded: (piece: Piece) => void;
}) {
  const api = useApiClient();
  const read = row?.proposal?.capture ?? null;
  // The read's own words for the piece: held from this sitting, else read back from its job.
  const held = row ? capture.found(row) : undefined;
  const job = useApi(
    'jobs.get',
    { params: { id: read?.readId ?? '' } },
    { enabled: read !== null && !held },
  );
  const piece: ReadPiece | undefined =
    held ?? job.data?.output.readPieces?.find((p) => p.index === read?.index);
  const [tab, setTab] = useState<TabLabel>(TABS[0]);
  const [field, setField] = useState<PieceField | null>(null);
  const [changes, setChanges] = useState<RowChanges>({});
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A new row starts clean.
  const [seen, setSeen] = useState<string | null>(null);
  if ((row?.key ?? null) !== seen) {
    setSeen(row?.key ?? null);
    setTab(TABS[0]);
    setChanges({});
    setError(null);
  }
  const base: PieceValues | null = piece
    ? ({ ...readDraft(piece), category: piece.category } as PieceValues)
    : null;
  const values = base ? withTagDefaults({ ...base, ...changes } as PieceValues) : null;
  const crop = row ? look.captureImages[row.key] : undefined;
  const uri = renditionUri(crop, 390);
  const gone = read !== null && !held && job.isError;

  const add = async () => {
    if (!read || !values || adding) return;
    setAdding(true);
    setError(null);
    try {
      const filed = await api.call('photoReads.piece', {
        params: { id: read.readId },
        input: {
          index: read.index,
          edits: fileEdits(values.label, {
            ...changes,
            // What she wears it for is offered from the category; she files what she sees.
            ...(values.wearFor.length ? { wearFor: [...values.wearFor] } : {}),
          }),
        },
      });
      onAdded(filed);
      onClose();
    } catch {
      setError(copy.review.failed);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Subview
      open={row !== null}
      title={values?.label ?? row?.name ?? ''}
      onBack={onClose}
      testID="capture-new-piece"
      footer={
        <PrimaryScope>
          <Button
            disabled={!values || adding}
            loading={adding}
            loadingLabel={copy.review.adding}
            onPress={() => void add()}
            testID="capture-add-to-wardrobe"
          >
            {copy.review.cta}
          </Button>
        </PrimaryScope>
      }
    >
      <View className="gap-4">
        <View
          className="items-center justify-center overflow-hidden bg-surface-raised"
          style={{ marginHorizontal: -20, marginTop: -20, aspectRatio: 4 / 5 }}
        >
          {uri ? (
            <Image source={uri} alt="" aspect="4:5" contentFit="contain" className="w-full" />
          ) : null}
        </View>
        <Tabs items={TABS} value={tab} onChange={setTab} testID="capture-piece-tabs" />
        {values ? (
          <RecordRows
            values={values}
            onField={setField}
            withName
            only={TAB_OF[tab]}
            wearing={
              <>
                <PieceRow label={wardrobe.piece.rows.worn} value={wardrobe.card.new} first />
                <PieceRow
                  label={wardrobe.piece.rows.inLooks}
                  value={lookbook.savedLook.details.none}
                />
              </>
            }
          />
        ) : gone ? (
          <ErrorText>{copy.review.gone}</ErrorText>
        ) : (
          <RecordRows
            values={
              {
                ...readDraft({
                  label: row?.name ?? '',
                  brand: null,
                  notes: null,
                  categoryL2: null,
                  categoryL3: null,
                  color: null,
                }),
                category: row ? sheetOf(row) : null,
              } as PieceValues
            }
            onField={setField}
            withName
            only={TAB_OF[tab]}
            reading
          />
        )}
        {error ? <ErrorText>{error}</ErrorText> : null}
      </View>
      {values ? (
        <PieceFieldSheet
          piece={values}
          field={field}
          onClose={() => setField(null)}
          onSave={(input: UpdatePieceInput) => setChanges((c) => ({ ...c, ...rowChanges(input) }))}
          saving={false}
        />
      ) : null}
    </Subview>
  );
}
