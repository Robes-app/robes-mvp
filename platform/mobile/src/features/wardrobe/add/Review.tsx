import { trackFiled } from '@robes/analytics';
import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { InboxEntry, PieceValues, ReadPiece, UpdatePieceInput } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { sheetL1For } from '@robes/core';
import {
  type AddDestination,
  bulkGroups,
  fileEdits,
  type RowChanges,
  readDraft,
  reviewScreen,
  rowChanges,
  wishChanges,
  withTagDefaults,
} from '@robes/core/add-flow';
import { shade } from '@robes/core/colour';
import { material } from '@robes/core/material';
import { Icon } from '@robes/icons/native';
import {
  Button,
  ErrorText,
  Eyebrow,
  fonts,
  Heading,
  MIN_TOUCH,
  maxFontSizeMultiplier,
  PrimaryScope,
  SubviewHeader,
  Text,
  useColor,
  useReducedMotion,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, Text as RNText, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PinnedAction } from '@/components/PinnedAction';
import { isTerminal } from '@/features/looks/ideas';
import { CropThumb } from '@/features/photo-pieces/PhotoFrame';
import { nativeAnalytics } from '@/lib/analytics';
import { type PieceField, PieceFieldSheet } from '../PieceFieldSheet';
import { RecordRows } from '../PieceRows';
import { manualHref, READ_PATIENCE_MS, type ReviewShot, sitting, wardrobeHref } from './flow';
import { type SessionShot, useShotSession } from './reads';

const old = wardrobe.add.review;
const copy = wardrobe.capture.review;
// How long the toast that follows "Add N to wardrobe" stands (Capture PRD 3c.5).
const ADDED_MS = 2800;
const WHOLE = { x: 0, y: 0, w: 1, h: 1 };

type Found =
  | { kind: 'read'; piece: ReadPiece; photo: { uri: string; width: number; height: number } }
  | { kind: 'link'; item: InboxEntry['items'][number] };

interface Entry {
  key: string;
  group: string;
  index: number;
  found: Found;
  // Robes' read; `category` is the read's own sheet where the taxonomy names none.
  base: PieceValues & { category?: string | null };
}

const sheetOf = (p: { categoryL2: string | null; category: string | null | undefined }) =>
  (p.categoryL2 && sheetL1For(p.categoryL2)) || p.category || '';

// Review (Capture PRD 3c.3–3c.5; canvas frame 3c): every photograph of the sitting, and a link's
// page, reviewed together. Two or more are a list she removes from and opens a piece out of;
// one is that piece's own page; "Add N to wardrobe" files what is left in one go, each piece once
// with her edits, then the wardrobe opens on them under a toast. Nothing files before that tap.
// From the camera, back and "+ Add another piece" return to it with the photographs kept (the
// camera stays beneath this screen). Web twin: components/wardrobe/add/review.tsx.
export function Review({
  to,
  from,
  shots,
  link,
}: {
  to: AddDestination;
  from: 'camera' | 'roll' | null;
  shots: readonly ReviewShot[];
  link: string | null;
}) {
  const api = useApiClient();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const session = useShotSession(shots);
  // A link's own entry (links never sit in the Inbox list, which holds receipts).
  const inbox = useApi('inbox.get', { params: { id: link ?? '' } }, { enabled: link !== null });
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set());
  const [changes, setChanges] = useState<Record<string, RowChanges>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [field, setField] = useState<PieceField | null>(null);
  const [adding, setAdding] = useState(false);
  const [failed, setFailed] = useState(false);
  // A link's Inbox entry leaves the Inbox once filed, so Review keeps the one it saw.
  const [held, setHeld] = useState<InboxEntry | null>(null);
  const seen = link && inbox.data?.id === link ? inbox.data : undefined;
  if (seen && !held) setHeld(seen);

  // The pieces, in the order she took the photos and Robes found them.
  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    for (const shot of session.shots) {
      const job = shot.jobId ? session.jobs.get(shot.jobId) : undefined;
      if (!shot.jobId || !job || !isTerminal(job)) continue;
      for (const piece of job.output.readPieces ?? []) {
        out.push({
          key: `${shot.jobId}:${piece.index}`,
          group: shot.jobId,
          index: piece.index,
          found: { kind: 'read', piece, photo: shot },
          base: { ...readDraft(piece), category: piece.category } as Entry['base'],
        });
      }
    }
    for (const item of held?.items ?? []) {
      out.push({
        key: `inbox:${held?.id}:${item.index}`,
        group: `inbox:${held?.id}`,
        index: item.index,
        found: { kind: 'link', item },
        base: readDraft({
          ...item,
          notes: null,
          categoryL2: null,
          categoryL3: null,
          color: null,
        }) as PieceValues,
      });
    }
    return out;
  }, [session.shots, session.jobs, held]);

  // Photographs whose read has not landed: each holds a "Reading the details…" row.
  const readingShots = session.shots.filter((s) => {
    const job = s.jobId ? session.jobs.get(s.jobId) : undefined;
    return !s.failed && !(job && isTerminal(job));
  });
  const linkReading = link !== null && !held && inbox.isPending;
  const reading = readingShots.length + (linkReading ? 1 : 0);
  const kept = entries.filter((e) => !removed.has(e.key));
  const screen = reviewScreen({ keys: kept.map((e) => e.key), reading, open });

  // A read that takes too long offers the piece by hand (redline 01).
  const waiting = reading > 0 && kept.length === 0;
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!waiting) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), READ_PATIENCE_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/wardrobe/add', params: { to } });
  };
  // The camera is beneath Review when she came from it: going back keeps its photographs.
  const toCamera = from === 'camera' ? leave : null;

  // The last piece removed: back to the camera with nothing in hand (3c.3).
  const emptied = screen.kind === 'camera' && entries.length > 0;
  const left = useRef(false);
  useEffect(() => {
    if (!emptied || left.current) return;
    left.current = true;
    sitting.empty();
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/wardrobe/add', params: { to } });
  }, [emptied, router, to]);

  const remove = (key: string) => {
    setRemoved((r) => new Set(r).add(key));
    setOpen(null);
  };
  const valuesOf = (e: Entry): PieceValues => ({ ...e.base, ...changes[e.key] }) as PieceValues;

  async function addAll() {
    if (adding || reading > 0 || kept.length === 0) return;
    setAdding(true);
    setFailed(false);
    try {
      for (const { group, answers } of bulkGroups(entries, removed, changes)) {
        const labelOf = (i: number) =>
          entries.find((e) => e.group === group && e.index === i)?.base.label ?? '';
        if (group.startsWith('inbox:')) {
          const id = group.slice('inbox:'.length);
          const keep = answers.filter((a) => a.state === 'add');
          const decision = await api.call('inbox.decide', {
            params: { id },
            input: keep.length
              ? { action: to, itemIndexes: keep.map((a) => a.index) }
              : { action: 'dismiss' },
          });
          // Her changes land on what the decision filed (a link holds one piece).
          await Promise.all(
            keep.map((a, i) => {
              const pieceId = decision.filedIds[i];
              if (!pieceId || !a.edits) return null;
              return to === 'wishlist'
                ? api.call('wishlist.update', {
                    params: { id: pieceId },
                    input: wishChanges(a.edits),
                  })
                : api.call('wardrobe.update', { params: { id: pieceId }, input: a.edits });
            }),
          );
          await queryClient.invalidateQueries({ queryKey: queryKeys.route('inbox.list') });
        } else {
          await api.call('photoReads.file', {
            params: { id: group },
            input: {
              to,
              answers: answers.map((a) =>
                a.state === 'add'
                  ? {
                      index: a.index,
                      state: 'add' as const,
                      edits: fileEdits(labelOf(a.index), a.edits ?? {}),
                    }
                  : { index: a.index, state: 'skip' as const },
              ),
            },
          });
        }
        trackFiled(
          nativeAnalytics.track,
          group.startsWith('inbox:') ? 'link' : 'photo',
          answers,
          to,
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.route(to === 'wishlist' ? 'wishlist.list' : 'wardrobe.list'),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.summary') }),
      ]);
      // The camera beneath must not come back holding what is now filed.
      sitting.empty();
      toast.show({ message: wardrobe.capture.added(kept.length, to), duration: ADDED_MS });
      // From the camera, Review stands on it: both leave, and the wardrobe takes their place.
      if (from === 'camera' && router.canGoBack()) router.back();
      router.replace(wardrobeHref(to));
    } catch {
      // Each piece files once, so trying again files only what is left.
      setFailed(true);
      setAdding(false);
    }
  }

  const another = toCamera ? (
    <Pressable
      accessibilityRole="button"
      onPress={toCamera}
      testID="review-another"
      style={{ minHeight: MIN_TOUCH }}
      className="items-center justify-center self-center"
    >
      <Text size="small" tone="muted" className="underline">
        {copy.another}
      </Text>
    </Pressable>
  ) : null;
  const addButton = (
    <Button
      disabled={adding || reading > 0 || kept.length === 0}
      onPress={() => void addAll()}
      testID="review-add"
    >
      {adding ? copy.adding : copy.add(kept.length + reading, to)}
    </Button>
  );
  const problem = failed ? <ErrorText>{old.failed}</ErrorText> : null;
  const frame = (title: string, onBack: () => void, body: ReactNode, foot: ReactNode) => (
    <PrimaryScope>
      <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
        <SubviewHeader title={title} onBack={onBack} />
        <ScrollView contentContainerClassName="gap-4 px-5 pt-4 pb-12">{body}</ScrollView>
        {foot ? <PinnedAction>{foot}</PinnedAction> : null}
      </View>
    </PrimaryScope>
  );

  // Nothing found, and nothing still reading: the photo by hand.
  if (screen.kind === 'camera') {
    if (entries.length > 0) return null;
    return frame(
      copy.title,
      leave,
      <>
        <Heading size="md" style={{ fontSize: 28 }} accessibilityLiveRegion="polite">
          {old.unread}
        </Heading>
        <Text tone="muted">{session.shots.some((s) => s.failed) ? old.stalled : old.nothing}</Text>
        <FillIn to={to} shot={session.shots.at(-1)} />
      </>,
      null,
    );
  }

  if (screen.kind === 'list') {
    return frame(
      copy.title,
      leave,
      <>
        <View className="gap-2">
          <Heading size="md" style={{ fontSize: 28 }}>
            {copy.head(screen.count)}
          </Heading>
          <Text size="small" tone="muted">
            {copy.sub}
          </Text>
        </View>
        <View
          testID="review-list"
          className="overflow-hidden rounded-card border-rule-mid bg-surface-raised"
          style={{ borderWidth: 0.5 }}
        >
          {kept.map((e, i) => (
            <ReviewRow
              key={e.key}
              first={i === 0}
              entry={e}
              values={valuesOf(e)}
              onOpen={() => setOpen(e.key)}
              onRemove={() => remove(e.key)}
            />
          ))}
          {readingShots.map((shot, i) => (
            <ReadingRow key={shot.key} shot={shot} first={kept.length + i === 0} />
          ))}
          {linkReading ? <ReadingRow shot={null} first={kept.length === 0} /> : null}
        </View>
        {another}
        {problem}
      </>,
      addButton,
    );
  }

  // One piece: the sitting's only one, or one opened from the list.
  const entry = kept.find((e) => e.key === screen.key);
  const single = screen.kind === 'single';
  const values = entry ? withTagDefaults(valuesOf(entry)) : null;
  const shot = entry?.found.kind === 'read' ? entry.found.photo : (readingShots[0] ?? null);
  const blank = {
    ...readDraft({
      label: '',
      brand: null,
      notes: null,
      categoryL2: null,
      categoryL3: null,
      color: null,
    }),
    category: null,
  } as PieceValues;
  return (
    <>
      {frame(
        single ? copy.one : copy.of(screen.at, screen.of),
        single ? leave : () => setOpen(null),
        <>
          <View className="items-center" testID="review-piece">
            {shot ? (
              <CropThumb
                photo={shot}
                box={entry?.found.kind === 'read' ? entry.found.piece.box : WHOLE}
                size={300}
              />
            ) : (
              <View style={{ width: 236, height: 300 }} className="rounded-crisp bg-surface-sunk" />
            )}
          </View>
          <View className="gap-2">
            <Eyebrow>{copy.piece}</Eyebrow>
            <RecordRows
              values={values ?? blank}
              onField={setField}
              withName
              only="piece"
              reading={!values}
            />
          </View>
          <View className="gap-2">
            <Eyebrow>{copy.colour}</Eyebrow>
            <RecordRows
              values={values ?? blank}
              onField={setField}
              only="colour"
              reading={!values}
            />
          </View>
          <Text size="small" tone="muted" className="text-center">
            {copy.footnote}
          </Text>
          {!values && slow ? <FillIn to={to} shot={session.shots.at(-1)} /> : null}
          {single ? another : entry ? <RemovePiece onPress={() => remove(entry.key)} /> : null}
          {problem}
        </>,
        single ? (
          addButton
        ) : (
          <Button onPress={() => setOpen(null)} testID="review-done">
            {copy.done}
          </Button>
        ),
      )}
      {entry && values ? (
        <PieceFieldSheet
          piece={values}
          field={field}
          onClose={() => setField(null)}
          onSave={(input: UpdatePieceInput) =>
            setChanges((c) => ({ ...c, [entry.key]: { ...c[entry.key], ...rowChanges(input) } }))
          }
          saving={false}
        />
      ) : null}
    </>
  );
}

// "Remove this piece", in danger, under a piece opened from the list (3c.4).
function RemovePiece({ onPress }: { onPress: () => void }) {
  const danger = useColor('danger');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID="review-remove-piece"
      style={{ minHeight: MIN_TOUCH }}
      className="items-center justify-center self-center"
    >
      <RNText
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        style={{ fontFamily: fonts.sans, fontSize: 13, color: danger }}
        className="underline"
      >
        {copy.removePiece}
      </RNText>
    </Pressable>
  );
}

// One piece on the list (3c.3): its crop, the category in small caps, the name in the serif,
// then Colour · Material · Brand, or "Add the details" when the read saw none of them. The row
// opens the piece; × removes it.
function ReviewRow({
  entry,
  values,
  first,
  onOpen,
  onRemove,
}: {
  entry: Entry;
  values: PieceValues;
  first: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');
  const ink = useColor('ink');
  const label = values.label || copy.piece;
  const sub =
    [shade(values.colourShade)?.name, material(values.material)?.name, values.brand]
      .filter(Boolean)
      .join(' · ') || copy.details;
  return (
    <View
      testID="review-row"
      className="flex-row items-center border-hairline"
      style={{ minHeight: 76, paddingLeft: 12, paddingRight: 8, borderTopWidth: first ? 0 : 0.5 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.open(label)}
        onPress={onOpen}
        className="flex-1 flex-row items-center gap-3.5 py-2.5"
      >
        {entry.found.kind === 'read' ? (
          <View style={{ width: 44, height: 55 }} className="items-center justify-center">
            <CropThumb photo={entry.found.photo} box={entry.found.piece.box} size={55} />
          </View>
        ) : (
          <View style={{ width: 44, height: 55 }} className="rounded-crisp bg-surface-sunk" />
        )}
        <View className="min-w-0 flex-1 gap-0.5">
          <RNText
            numberOfLines={1}
            maxFontSizeMultiplier={maxFontSizeMultiplier.label}
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 9,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              color: faint,
            }}
          >
            {sheetOf({ categoryL2: values.categoryL2, category: entry.base.category })}
          </RNText>
          <RNText
            numberOfLines={1}
            maxFontSizeMultiplier={maxFontSizeMultiplier.heading}
            style={{ fontFamily: fonts.display, fontSize: 17, lineHeight: 21, color: ink }}
          >
            {label}
          </RNText>
          <RNText
            numberOfLines={1}
            maxFontSizeMultiplier={maxFontSizeMultiplier.body}
            style={{ fontFamily: fonts.sans, fontSize: 12, color: faint }}
          >
            {sub}
          </RNText>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.remove(label)}
        onPress={onRemove}
        style={{ width: MIN_TOUCH, height: MIN_TOUCH }}
        className="items-center justify-center"
      >
        <View
          style={{ width: 30, height: 30 }}
          className="items-center justify-center rounded-pill bg-surface-sunk"
        >
          <Icon name="close" size={12} color={muted} />
        </View>
      </Pressable>
      <Icon name="forward" size={14} color={faint} />
    </View>
  );
}

// A photograph still being read: its thumbnail, and "Reading the details…" breathing.
function ReadingRow({ shot, first }: { shot: SessionShot | null; first: boolean }) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) return;
    opacity.setValue(0.35);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);
  return (
    <Animated.View
      testID="review-reading"
      className="flex-row items-center gap-3.5 border-hairline px-3"
      style={{ minHeight: 76, borderTopWidth: first ? 0 : 0.5, opacity }}
    >
      {shot ? (
        <Image
          source={{ uri: shot.uri }}
          contentFit="cover"
          accessible={false}
          style={{ width: 44, height: 55, borderRadius: 3 }}
        />
      ) : (
        <View style={{ width: 44, height: 55 }} className="rounded-crisp bg-surface-sunk" />
      )}
      <Text size="small" tone="muted" accessibilityLiveRegion="polite" className="flex-1">
        {copy.reading}
      </Text>
    </Animated.View>
  );
}

function FillIn({ to, shot }: { to: AddDestination; shot: ReviewShot | undefined }) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className="self-start"
      onPress={() => router.replace(manualHref(to, shot))}
    >
      {old.fillIn}
    </Button>
  );
}
