import { useApi, useApiClient } from '@robes/api-client/react';
import type { LookSet } from '@robes/contracts';
import { lookbook as copy, errors, jobs, ui } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { anchorName, deckReduce, deckTop, emptyDeck } from '@robes/core/looks';
import {
  Button,
  EmptyState,
  Eyebrow,
  Heading,
  IconButton,
  Image,
  PrimaryScope,
  Skeleton,
  Text,
  useReducedMotion,
  useToast,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, View } from 'react-native';
import { dayLabel } from '@/features/plan/plan';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { GenericModelBadge } from './GenericModelBadge';
import { isTerminal, JOB_REFRESH_MS } from './ideas';
import { type SetLook, useInvalidateLooks, useLookSet, useRequestFrame } from './look-states';
import { ScanLine } from './ScanLine';

const COMMIT_PX = 100;
const JOB_POLL_MS = 1500;

function DeckTitle({ set }: { set: LookSet | undefined }) {
  const { data: model } = useApi('me.model.get');
  const around = set?.anchor ? anchorName(set.anchor.label, set.anchor.brand) : '';
  const eyebrow = around
    ? copy.deck.eyebrowAround(around)
    : set?.dateHint
      ? copy.deck.eyebrowFor(dayLabel(set.dateHint))
      : copy.deck.eyebrowPrompt;
  return (
    <View className="items-center gap-1">
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading className="text-center">
        {`${around ? copy.deck.titleAround(around) : copy.deck.titlePrompt} ${copy.deck.titleTail}`}
      </Heading>
      {model?.filed ? (
        <Text size="caption" tone="muted">
          {copy.deck.modelYours}
        </Text>
      ) : null}
    </View>
  );
}

// While the looks compose: her piece (or her words) under the scanner, a line that changes every
// 2.2s. Three lists, one per surface (legacy): the deck's own two once the set exists, and before
// it lands the overlay's, which alone names who wears the looks until her twin is filed.
function Dressing({ set, prompt }: { set?: LookSet; prompt?: string | null }) {
  const [i, setI] = useState(0);
  const { data: model } = useApi('me.model.get');
  const around = set?.anchor ? anchorName(set.anchor.label, set.anchor.brand) : '';
  const lines = set
    ? set.anchor
      ? copy.deck.scanPiece
      : copy.deck.scanPrompt
    : model?.filed
      ? copy.deck.scanOverlay
      : [...copy.deck.scanOverlay, copy.deck.scanGeneric];
  useEffect(() => {
    const t = setInterval(() => setI((n) => n + 1), 2200);
    return () => clearInterval(t);
  }, []);
  const uri = renditionUri(set?.anchor?.image, 300);
  return (
    <View className="gap-3" accessibilityLiveRegion="polite" testID="deck-dressing">
      <View className="overflow-hidden rounded-soft">
        {uri ? (
          <Image source={uri} alt="" />
        ) : (
          <View
            className="items-center justify-center bg-surface-sunk p-8"
            style={{ aspectRatio: 4 / 5 }}
          >
            <Heading>“</Heading>
            {(prompt ?? set?.prompt) ? (
              <Text tone="muted" className="text-center">
                {(prompt ?? set?.prompt ?? '').slice(0, 90)}
              </Text>
            ) : null}
          </View>
        )}
        <ScanLine />
      </View>
      <Text>{around ? copy.deck.yourPiece(around) : copy.deck.composing}</Text>
      <Text size="small" tone="muted">
        {lines[i % lines.length]}
      </Text>
      <Text size="caption" tone="muted" className="text-center">
        {copy.deck.teach}
      </Text>
    </View>
  );
}

function Card({
  look,
  onOpen,
  onDecide,
}: {
  look: SetLook;
  onOpen: () => void;
  onDecide: (dir: 1 | -1) => void;
}) {
  const reduced = useReducedMotion();
  const dx = useRef(new Animated.Value(0)).current;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => dx.setValue(g.dx),
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) < COMMIT_PX) {
            Animated.spring(dx, { toValue: 0, useNativeDriver: true }).start();
            return;
          }
          const dir = g.dx > 0 ? 1 : -1;
          if (reduced) {
            onDecide(dir);
            return;
          }
          Animated.timing(dx, { toValue: dir * 600, duration: 240, useNativeDriver: true }).start(
            () => onDecide(dir),
          );
        },
      }),
    [dx, onDecide, reduced],
  );
  const uri = renditionUri(look.image, 360);
  const rotate = dx.interpolate({ inputRange: [-200, 200], outputRange: ['-8deg', '8deg'] });
  const keep = dx.interpolate({
    inputRange: [0, COMMIT_PX],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const pass = dx.interpolate({
    inputRange: [-COMMIT_PX, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  return (
    <Animated.View
      {...pan.panHandlers}
      style={{ transform: [{ translateX: dx }, { rotate }] }}
      testID={`deck-card-${look.id}`}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={look.name}
        onPress={onOpen}
        className="gap-2 rounded-soft border border-hairline bg-surface p-2"
      >
        {uri ? (
          <Image source={uri} alt="" blurhash={look.image?.blurhash} />
        ) : (
          <Skeleton width="100%" aspectRatio={4 / 5} />
        )}
        <Text>{look.name}</Text>
        <Text size="small" tone="muted">
          {copy.deck.pieces(look.pieces.length + look.proposals.length)}
        </Text>
      </Pressable>
      <Animated.View
        className="absolute left-4 top-4 rounded-crisp border border-border-control bg-bg px-2 py-1"
        style={{ opacity: keep }}
      >
        <Text size="caption">{`✓ ${copy.deck.keep}`}</Text>
      </Animated.View>
      <Animated.View
        className="absolute right-4 top-4 rounded-crisp border border-hairline bg-bg px-2 py-1"
        style={{ opacity: pass }}
      >
        <Text size="caption" tone="muted">{`✕ ${copy.deck.pass}`}</Text>
      </Animated.View>
      {/* Last, so it sits over the stamps. Its own Pressable, so a tap never reaches the card. */}
      <GenericModelBadge />
    </Animated.View>
  );
}

// Keep or pass (legacy F14): one card at a time; a pass waits behind "Passed · Undo"; a keep
// leaves the look waiting in Suggested until she saves it.
// `home`: opened from home or onboarding, so back lands home (never back into onboarding).
export function Deck({
  setId,
  prompt,
  home = false,
}: {
  setId: string;
  prompt?: string | null;
  home?: boolean;
}) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const refresh = useInvalidateLooks();
  const requestFrame = useRequestFrame();
  const [deck, dispatch] = useReducer(deckReduce, undefined, emptyDeck);
  // The job that writes the set: until it ends, an empty set is still being composed.
  const [jobId, setJobId] = useState<string | null>(null);
  const job = useApi(
    'jobs.get',
    { params: { id: jobId ?? '' } },
    {
      enabled: jobId !== null,
      refetchInterval: (q) =>
        q.state.data && isTerminalJobStatus(q.state.data.status) ? false : JOB_POLL_MS,
    },
  );
  const jobDone = job.data ? isTerminalJobStatus(job.data.status) : false;
  const {
    data: set,
    isError,
    error,
  } = useLookSet(setId, {
    waiting: !jobDone && deck.order.length === 0,
  });
  useEffect(() => {
    if (set?.jobId) setJobId(set.jobId);
  }, [set?.jobId]);
  const looks = set?.looks ?? [];
  const ids = looks.map((l) => l.id).join(',');
  useEffect(() => {
    if (ids) dispatch({ type: 'land', ids: ids.split(',') });
  }, [ids]);
  const topId = deckTop(deck);
  const top = looks.find((l) => l.id === topId);
  // The card she is on (and the next) get their frame if it isn't drawn yet (UX-09).
  const asked = useRef(new Set<string>());
  useEffect(() => {
    for (const id of deck.order.slice(deck.at, deck.at + 2)) {
      const l = looks.find((x) => x.id === id);
      if (l && !l.image && !l.framePending && !asked.current.has(id)) {
        asked.current.add(id);
        requestFrame(id);
      }
    }
  }, [deck, looks, requestFrame]);

  const decide = (id: string, dir: 1 | -1) => {
    if (dir > 0) {
      dispatch({ type: 'keep', id });
      return;
    }
    dispatch({ type: 'pass', id });
    void api
      .call('looks.delete', { params: { id } })
      .then(() =>
        toast.show({
          message: copy.passed,
          action: {
            label: ui.undo,
            onPress: () =>
              void api
                .call('looks.restore', { params: { id } })
                .then(() => {
                  dispatch({ type: 'undo', id });
                  refresh();
                })
                .catch(() => toast.show({ message: errors.internal })),
          },
        }),
      )
      .catch(() => toast.show({ message: errors.internal }));
  };

  if (isError) return <EmptyState title={errorMessage(error)} />;
  const around = set?.anchor ? anchorName(set.anchor.label, set.anchor.brand) : '';
  // Done once she has decided every card (all passed included), or the job ended with none.
  const done =
    !top && (deck.order.length > 0 || (set !== undefined && jobDone && looks.length === 0));
  const composing = !set || (looks.length === 0 && !done);
  const kept = deck.kept.map((id) => looks.find((l) => l.id === id)).filter((l) => l !== undefined);
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12" testID="deck">
      <DeckTitle set={set} />
      {composing ? (
        <Dressing {...(set ? { set } : {})} prompt={prompt ?? null} />
      ) : done ? (
        <View className="items-center gap-4" testID="deck-done">
          <Heading className="text-center">{copy.deck.kept(kept.length)}</Heading>
          {kept.length ? (
            <View className="flex-row gap-2">
              {kept.map((l) => {
                const uri = renditionUri(l.image, 80);
                return (
                  <Pressable
                    key={l.id}
                    accessibilityRole="button"
                    accessibilityLabel={l.name}
                    onPress={() => router.push(`/look/${l.id}`)}
                    style={{ width: 80 }}
                  >
                    {uri ? (
                      <Image source={uri} alt="" />
                    ) : (
                      <Skeleton width="100%" aspectRatio={4 / 5} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text tone="muted" className="text-center">
              {around ? copy.deck.noneAgainPiece : copy.deck.noneAgainPrompt}
            </Text>
          )}
          <PrimaryScope>
            {kept.length ? (
              <Button onPress={() => router.replace('/looks?tab=suggested')}>
                {copy.deck.see}
              </Button>
            ) : null}
            <Button
              variant="quiet"
              onPress={() => (home || !router.canGoBack() ? router.replace('/') : router.back())}
            >
              {around ? copy.deck.backTo(around) : copy.deck.backHome}
            </Button>
          </PrimaryScope>
        </View>
      ) : top ? (
        <View className="gap-4">
          <Card
            key={top.id}
            look={top}
            onOpen={() => router.push(`/look/${top.id}`)}
            onDecide={(dir) => decide(top.id, dir)}
          />
          <View className="flex-row items-center justify-center gap-8">
            <IconButton icon="close" label={copy.deck.pass} onPress={() => decide(top.id, -1)} />
            <IconButton
              icon="check"
              label={copy.deck.keep}
              onPress={() => decide(top.id, 1)}
              tone="ink"
            />
          </View>
          <View className="flex-row justify-center gap-1" accessibilityElementsHidden>
            {deck.order.map((id, i) => (
              <View
                key={id}
                className={`h-1.5 w-1.5 rounded-pill ${i === deck.at ? 'bg-ink' : 'bg-surface-sunk'}`}
              />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

// After a styling job: the deck, dressing until the looks land.
export function JobDeck({ jobId, home = false }: { jobId: string; home?: boolean }) {
  const job = useApi(
    'jobs.get',
    { params: { id: jobId } },
    {
      refetchInterval: (q) =>
        isTerminal(q.state.data) || q.state.data?.output.setId ? false : JOB_REFRESH_MS,
    },
  );
  const setId = job.data?.output.setId;
  // Looks minted before the job failed (a frame that ran out of time) still make the deck.
  if (setId) return <Deck setId={setId} home={home} />;
  if (job.isError) return <EmptyState title={errorMessage(job.error)} />;
  if (job.data?.status === 'failed' || job.data?.status === 'cancelled') {
    return <EmptyState title={copy.deck.failed} body={jobs.status.failed} />;
  }
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      <DeckTitle set={undefined} />
      <Dressing />
    </ScrollView>
  );
}
