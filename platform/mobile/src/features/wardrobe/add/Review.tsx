import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { InboxEntry, PieceValues, ReadPiece, UpdatePieceInput } from '@robes/contracts';
import { ui, wardrobe } from '@robes/copy';
import { sheetL1For } from '@robes/core';
import {
  type AddDestination,
  fileEdits,
  nextPending,
  type ReviewEntry,
  type RowChanges,
  readDraft,
  readyGroups,
  reviewTally,
  rowChanges,
  SCAN_READY_STEP,
  SCAN_STEP_MS,
  SCAN_STEPS,
  scanTags,
  wishChanges,
} from '@robes/core/add-flow';
import { shade } from '@robes/core/colour';
import { pieceWord } from '@robes/core/photo-pieces';
import {
  Button,
  Em,
  ErrorText,
  Heading,
  PrimaryScope,
  Text,
  useColor,
  useReducedMotion,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { PinnedAction } from '@/components/PinnedAction';
import { isTerminal } from '@/features/looks/ideas';
import { CropThumb } from '@/features/photo-pieces/PhotoFrame';
import { type PieceField, PieceFieldSheet } from '../PieceFieldSheet';
import { RecordRows } from '../PieceRows';
import {
  manualHref,
  pickFromRoll,
  READ_PATIENCE_MS,
  type ReviewShot,
  reviewHref,
  wardrobeHref,
} from './flow';
import { useShotSession } from './reads';
import { ScanPhoto, type ScanSource } from './ScanPhoto';

const copy = wardrobe.add;

type Found =
  | { kind: 'read'; piece: ReadPiece; photo: { uri: string; width: number; height: number } }
  | { kind: 'link'; item: InboxEntry['items'][number] };

type Entry = ReviewEntry<RowChanges> & { found: Found; base: PieceValues };

const sheetOf = (p: { categoryL2: string | null; category: string }) =>
  (p.categoryL2 && sheetL1For(p.categoryL2)) || p.category;

// Review (design "Add Piece — Handoff"): every way in lands here, one piece at a time, and
// nothing files without a look. The scan plays, the rows resolve from "Reading…", any row opens
// its drawer, and the one ink button files the piece and walks on to the next. A read files once
// all its pieces are answered (its spare crops are let go); a link files on its own. When the
// last piece is answered, Filed says how many. Web twin: components/wardrobe/add/review.tsx.
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
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const session = useShotSession(shots);
  // A link's own entry (links never sit in the Inbox list, which holds receipts).
  const inbox = useApi('inbox.get', { params: { id: link ?? '' } }, { enabled: link !== null });
  const [answers, setAnswers] = useState<
    Record<string, { answer: 'add' | 'skip'; edits?: RowChanges }>
  >({});
  const [changes, setChanges] = useState<Record<string, RowChanges>>({});
  const [current, setCurrent] = useState<string | null>(null);
  const [field, setField] = useState<PieceField | null>(null);
  const [step, setStep] = useState(0);
  const [filed, setFiled] = useState<Set<string>>(() => new Set());
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const filing = useRef(new Set<string>());
  // A link's Inbox entry leaves the Inbox once filed, so Review keeps the one it saw.
  const [held, setHeld] = useState<InboxEntry | null>(null);
  const seen = link && inbox.data?.id === link ? inbox.data : undefined;
  if (seen && !held) setHeld(seen);

  // The queue, in the order she took the photos and Robes found the pieces.
  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    for (const shot of session.shots) {
      const job = shot.jobId ? session.jobs.get(shot.jobId) : undefined;
      if (!shot.jobId || !job || !isTerminal(job)) continue;
      for (const piece of job.output.readPieces ?? []) {
        const key = `${shot.jobId}:${piece.index}`;
        out.push({
          key,
          group: shot.jobId,
          index: piece.index,
          answer: answers[key]?.answer ?? 'pending',
          ...(answers[key]?.edits ? { edits: answers[key].edits } : {}),
          found: { kind: 'read', piece, photo: shot },
          base: readDraft(piece),
        });
      }
    }
    const entry = held;
    for (const item of entry?.items ?? []) {
      const key = `inbox:${entry?.id}:${item.index}`;
      out.push({
        key,
        group: `inbox:${entry?.id}`,
        index: item.index,
        answer: answers[key]?.answer ?? 'pending',
        ...(answers[key]?.edits ? { edits: answers[key].edits } : {}),
        found: { kind: 'link', item },
        base: readDraft({ ...item, notes: null, categoryL2: null, categoryL3: null, color: null }),
      });
    }
    return out;
  }, [session.shots, session.jobs, held, answers]);

  const at = current ? entries.findIndex((e) => e.key === current) : -1;
  const pendingAt = at >= 0 && entries[at]?.answer === 'pending' ? at : nextPending(entries, -1);
  const cur = pendingAt === null ? undefined : entries[pendingAt];
  const reading = session.reading || (link !== null && !held && inbox.isPending);

  // Twenty seconds without a piece to show: offer the piece by hand (a late read still lands).
  const waiting = reading && !cur;
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!waiting) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), READ_PATIENCE_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

  // Each piece plays its scan once, as it comes up.
  // biome-ignore lint/correctness/useExhaustiveDependencies: restart only when the piece changes.
  useEffect(() => {
    if (!cur) return;
    if (reduced) {
      setStep(SCAN_STEPS);
      return;
    }
    setStep(0);
    const timer = setInterval(
      () =>
        setStep((s) => {
          if (s + 1 >= SCAN_STEPS) clearInterval(timer);
          return s + 1;
        }),
      SCAN_STEP_MS,
    );
    return () => clearInterval(timer);
  }, [cur?.key, reduced]);

  // A group files the moment its last piece is answered.
  useEffect(() => {
    for (const { group, answers: groupAnswers } of readyGroups(entries, filed)) {
      if (filing.current.has(group) || failed.has(group)) continue;
      filing.current.add(group);
      const done = () => setFiled((s) => new Set(s).add(group));
      fileGroup(group, groupAnswers)
        .then(done)
        .catch(() => setFailed((f) => new Set(f).add(group)))
        .finally(() => filing.current.delete(group));
    }
  });

  async function fileGroup(
    group: string,
    groupAnswers: Array<{ index: number; state: 'add' | 'skip'; edits?: RowChanges }>,
  ) {
    const labelOf = (i: number) =>
      entries.find((e) => e.group === group && e.index === i)?.base.label ?? '';
    if (group.startsWith('inbox:')) {
      const id = group.slice('inbox:'.length);
      const kept = groupAnswers.filter((a) => a.state === 'add');
      const decision = await api.call('inbox.decide', {
        params: { id },
        input: kept.length
          ? { action: to, itemIndexes: kept.map((a) => a.index) }
          : { action: 'dismiss' },
      });
      // Her changes land on what the decision filed (a link holds one piece).
      await Promise.all(
        kept.map((a, i) => {
          const pieceId = decision.filedIds[i];
          if (!pieceId || !a.edits) return null;
          return to === 'wishlist'
            ? api.call('wishlist.update', { params: { id: pieceId }, input: wishChanges(a.edits) })
            : api.call('wardrobe.update', { params: { id: pieceId }, input: a.edits });
        }),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('inbox.list') });
    } else {
      await api.call('photoReads.file', {
        params: { id: group },
        input: {
          to,
          answers: groupAnswers.map((a) =>
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
    await queryClient.invalidateQueries({
      queryKey: queryKeys.route(to === 'wishlist' ? 'wishlist.list' : 'wardrobe.list'),
    });
  }

  function answer(entry: Entry, state: 'add' | 'skip') {
    const edits = changes[entry.key];
    setAnswers((a) => ({ ...a, [entry.key]: { answer: state, ...(edits ? { edits } : {}) } }));
    const next = nextPending(
      entries.map((e) => (e.key === entry.key ? { ...e, answer: state } : e)),
      entries.indexOf(entry),
    );
    setCurrent(next === null ? null : (entries[next]?.key ?? null));
  }

  async function retake() {
    if (from === 'roll') {
      const picked = await pickFromRoll();
      if (picked && picked !== 'denied' && picked.length)
        router.replace(reviewHref({ to, shots: picked, from: 'roll' }));
      return;
    }
    router.replace({ pathname: '/wardrobe/camera', params: { to } });
  }

  const tally = reviewTally(entries);
  const allFiled = readyGroups(entries, filed).length === 0 && tally.pending === 0;
  const anyFound = entries.length > 0;

  // Filed: every piece answered and filed, nothing still reading.
  if (!reading && !cur && anyFound && allFiled && filing.current.size === 0) {
    return <Filed to={to} kept={tally.kept} />;
  }

  const latest = session.shots.at(-1);
  const fillIn = (
    <Button
      variant="secondary"
      className="self-start"
      onPress={() => router.replace(manualHref(to, latest))}
    >
      {copy.review.fillIn}
    </Button>
  );

  // Nothing in any photo (or a link that never arrived): she fills it in herself.
  if (!reading && !anyFound) {
    const stalled = session.shots.some((s) => s.failed);
    return (
      <ScrollView contentContainerClassName="gap-4 px-6 pb-12">
        <Heading size="md" style={{ fontSize: 28 }} accessibilityLiveRegion="polite">
          {copy.review.unread}
        </Heading>
        <Text tone="muted">{stalled ? copy.review.stalled : copy.review.nothing}</Text>
        {fillIn}
      </ScrollView>
    );
  }

  // The next piece isn't read yet: the latest photo, the scan line falling, three rows breathing.
  if (!cur) {
    const count = Math.max(1, session.shots.length);
    return (
      <ScrollView contentContainerClassName="gap-5 px-6 pb-12" accessibilityState={{ busy: !slow }}>
        <Heading size="md" style={{ fontSize: 28 }} accessibilityLiveRegion="polite">
          {slow ? (
            copy.review.unread
          ) : (
            <>
              {copy.review.readingHead.pre} <Em>{copy.review.readingHead.wink}</Em>{' '}
              {copy.review.readingHead.post(count)}
            </>
          )}
        </Heading>
        <ScanPhoto
          source={latest ? { ...latest, box: { x: 0, y: 0, w: 1, h: 1 } } : null}
          monogram={copy.review.eyebrow}
          step={0}
          tags={[]}
          caption=""
          alt={copy.review.readingPhoto(count)}
          scanning={!slow}
        />
        {slow ? fillIn : <BreathingRows />}
        {failed.size ? <Retry onRetry={() => setFailed(new Set())} /> : null}
        {slow ? null : (
          <Button
            variant="quiet"
            className="self-center"
            onPress={() => router.replace({ pathname: '/wardrobe/add', params: { to } })}
          >
            {copy.review.cancel}
          </Button>
        )}
      </ScrollView>
    );
  }

  const values: PieceValues = { ...cur.base, ...changes[cur.key] } as PieceValues;
  const ready = step >= SCAN_READY_STEP;
  const isRead = cur.found.kind === 'read';
  const source: ScanSource | null =
    cur.found.kind === 'read' ? { ...cur.found.photo, box: cur.found.piece.box } : null;
  const category = cur.found.kind === 'read' ? sheetOf(cur.found.piece) : null;
  const tags = scanTags([
    category,
    cur.found.kind === 'read' ? pieceWord(cur.found.piece) : null,
    values.brand,
    shade(values.colourShade)?.name,
    values.label,
  ]);
  const position = entries.indexOf(cur);
  const hasNext = nextPending(entries, position) !== null || session.reading;
  const save = (input: UpdatePieceInput) =>
    setChanges((c) => ({ ...c, [cur.key]: { ...c[cur.key], ...rowChanges(input) } }));

  return (
    <PrimaryScope>
      <ScrollView contentContainerClassName="gap-5 px-6 pb-12">
        {entries.length > 1 ? (
          <ScrollView
            horizontal
            accessibilityLabel={copy.review.pieces}
            contentContainerClassName="gap-2"
            showsHorizontalScrollIndicator={false}
          >
            {entries.map((e, i) => (
              <Pressable
                key={e.key}
                accessibilityRole="button"
                accessibilityLabel={copy.review.piece(i + 1, entries.length)}
                accessibilityState={{ selected: e.key === cur.key }}
                disabled={e.answer !== 'pending'}
                onPress={() => setCurrent(e.key)}
                className={`rounded-crisp border p-[2px] ${e.key === cur.key ? 'border-selected-line' : 'border-transparent'} ${e.answer === 'pending' ? '' : 'opacity-40'}`}
              >
                {e.found.kind === 'read' ? (
                  <CropThumb photo={e.found.photo} box={e.found.piece.box} size={52} />
                ) : (
                  <View className="size-[52px] rounded-soft bg-surface-sunk" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View className="gap-2">
          <Heading size="md" style={{ fontSize: 28 }}>
            {copy.review.title} <Em>{copy.review.wink}</Em>
          </Heading>
          <Text tone="muted" size="small">
            {isRead ? copy.review.sub.photo : copy.review.sub.link}
          </Text>
        </View>
        <View>
          <ScanPhoto
            source={source}
            monogram={values.label}
            step={step}
            tags={tags}
            caption={ready ? values.label : ''}
            alt={wardrobe.photoAlt(values.label)}
          />
          {isRead && shots.length === 1 && from ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.review.retake}
              onPress={() => void retake()}
              className="absolute top-3 right-3 min-h-11 justify-center rounded-pill bg-bg px-4"
            >
              <Text size="small">{copy.review.retake}</Text>
            </Pressable>
          ) : null}
        </View>
        <FadeIn key={cur.key}>
          <RecordRows values={values} onField={setField} withName reading={!ready} />
        </FadeIn>
        <Button variant="quiet" className="self-center" onPress={() => answer(cur, 'skip')}>
          {copy.review.notThis}
        </Button>
        {failed.size ? <Retry onRetry={() => setFailed(new Set())} /> : null}
      </ScrollView>
      <PinnedAction>
        <Button disabled={!ready} onPress={() => answer(cur, 'add')}>
          {copy.review.file(to, hasNext)}
        </Button>
      </PinnedAction>
      <PieceFieldSheet
        piece={values}
        field={field}
        onClose={() => setField(null)}
        onSave={save}
        saving={false}
      />
    </PrimaryScope>
  );
}

// Three rows still to come, on a white card, breathing between faint and full (redline 01).
function BreathingRows() {
  const reduced = useReducedMotion();
  const sunk = useColor('surface-sunk');
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
    <View aria-hidden className="gap-3 rounded-soft border border-hairline bg-surface-raised p-4">
      {['60%', '40%', '30%'].map((w) => (
        <Animated.View
          key={w}
          style={{
            width: w as `${number}%`,
            height: 12,
            borderRadius: 999,
            backgroundColor: sunk,
            opacity,
          }}
        />
      ))}
    </View>
  );
}

// The rows arrive as the read lands: a short fade, none under reduced motion.
function FadeIn({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [opacity, reduced]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

function Retry({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="gap-2">
      <ErrorText>{copy.review.failed}</ErrorText>
      <Button variant="quiet" className="self-start" onPress={onRetry}>
        {ui.retry}
      </Button>
    </View>
  );
}

// Filed (design 3a): how many, in words, one line on where they are, and the way on.
export function Filed({ to, kept }: { to: AddDestination; kept: number }) {
  const router = useRouter();
  const go = (href: Href) => router.replace(href);
  return (
    <PrimaryScope>
      <View className="flex-1 justify-center gap-6 px-6 pb-16">
        <View className="gap-3">
          <Heading size="md" style={{ fontSize: 36 }}>
            {kept ? (
              <>
                {copy.filed.head(kept)} <Em>{copy.filed.wink}</Em>
              </>
            ) : (
              copy.filed.none
            )}
          </Heading>
          {kept ? (
            <Text tone="muted">
              {to === 'wishlist' ? copy.filed.line.wishlist(kept) : copy.filed.line.wardrobe}
            </Text>
          ) : null}
        </View>
        <View className="gap-3">
          <Button onPress={() => go(wardrobeHref(to))}>{copy.filed.see[to]}</Button>
          <Button
            variant="secondary"
            onPress={() => go({ pathname: '/wardrobe/add', params: { to } })}
          >
            {copy.filed.another}
          </Button>
        </View>
      </View>
    </PrimaryScope>
  );
}
