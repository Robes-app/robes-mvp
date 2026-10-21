import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { Me, Piece } from '@robes/contracts';
import { firstRun as copy, home, onboarding } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import {
  Button,
  Em,
  ErrorText,
  Eyebrow,
  Heading,
  Image,
  PrimaryScope,
  Sheet,
  Text,
  useColor,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FirstRunFrame } from '@/features/home/FirstRunFrame';
import { type PhotoSource, pickOne, usePhotoFiling } from '@/features/home/file-photo';
import { isTerminal } from '@/features/looks/ideas';
import { errorMessage } from '@/lib/errors';

const REVEAL_MS = 480;
const COMPOSE_CAP_MS = 20_000;
const LINE_MS = 700;
const JOB_REFRESH_MS = 1_500;

// The first piece, read live (legacy 1c), then Composing (1e) and the deck.
export default function FirstPiece() {
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const me = useApi('me.get');
  const name = me.data?.firstName?.trim().split(/\s+/)[0] || null;
  const { filing, file, reset } = usePhotoFiling();
  const [menu, setMenu] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [skipArmed, setSkipArmed] = useState(false);
  const [leaving, setLeaving] = useState<'style' | 'skip' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const styled = useRef<{ pieceId: string; jobId: string } | null>(null);
  const piece = filing.phase === 'filed' ? filing.piece : null;
  const reading = filing.phase === 'uploading' || filing.phase === 'reading';

  useEffect(() => {
    if (!piece) {
      setRevealed(0);
      return;
    }
    const t = setInterval(
      () => setRevealed((n) => Math.min(n + 1, copy.piece.rows.length)),
      REVEAL_MS,
    );
    return () => clearInterval(t);
  }, [piece]);

  async function finish(): Promise<void> {
    await api.call('me.onboarding.complete');
    // No /me observer is mounted on the tabs gate yet; the cache must already say onboarded.
    queryClient.setQueryData<Me>(queryKeys.call('me.get'), (old) =>
      old ? { ...old, onboarded: true } : old,
    );
    await queryClient.invalidateQueries({ queryKey: queryKeys.route('me.get') });
  }

  async function style(p: Piece) {
    setLeaving('style');
    setError(null);
    try {
      // A retry after a failed finish reuses the job: never a second generation (or quota).
      const kept = styled.current?.pieceId === p.id ? styled.current.jobId : null;
      const id =
        kept ??
        (await api.call('looks.generate', { input: { anchor: { type: 'piece', pieceId: p.id } } }))
          .jobId;
      styled.current = { pieceId: p.id, jobId: id };
      await finish();
      setJobId(id);
    } catch (err) {
      setError(errorMessage(err));
      setLeaving(null);
    }
  }

  async function skip() {
    if (!skipArmed) {
      setSkipArmed(true);
      return;
    }
    setLeaving('skip');
    try {
      await finish();
      router.replace('/');
    } catch {
      setError(onboarding.failed);
      setLeaving(null);
    }
  }

  const add = async (source: PhotoSource) => {
    setMenu(false);
    const picked = await pickOne(source);
    if (picked === 'denied' || !picked) return;
    setError(null);
    void file(picked);
  };

  if (jobId) return <Compose jobId={jobId} name={name} />;

  const values = piece
    ? [
        piece.label || copy.piece.read,
        piece.categoryL2 ?? piece.category,
        piece.brand ?? copy.piece.unlabelled,
        piece.color ?? copy.piece.read,
        piece.categoryL3 ?? '—',
      ]
    : null;
  const filed = piece !== null && revealed >= copy.piece.rows.length;
  const message =
    error ??
    (filing.phase === 'none'
      ? copy.piece.noPiece
      : filing.phase === 'failed'
        ? copy.piece.failed
        : null);
  const preview = filing.phase !== 'idle' && filing.phase !== 'none' ? filing.preview : null;
  const eyebrow = piece
    ? copy.piece.filed
    : reading
      ? copy.piece.reading
      : copy.piece.eyebrow(name);

  return (
    <PrimaryScope>
      <FirstRunFrame
        segs={piece ? 3 : 2}
        onBack={() => router.back()}
        footer={
          filed && piece ? (
            <Button
              onPress={() => void style(piece)}
              loading={leaving === 'style'}
              loadingLabel={copy.piece.filing}
            >
              {copy.piece.style}
            </Button>
          ) : reading || piece ? (
            <Text tone="muted" className="text-center">
              {copy.piece.wait}
            </Text>
          ) : (
            <Button
              variant="quiet"
              onPress={() => void skip()}
              loading={leaving === 'skip'}
              className="self-center"
            >
              {skipArmed ? copy.piece.skipAnyway : copy.piece.skip}
            </Button>
          )
        }
      >
        <View className="gap-2">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading size="md">
            {copy.piece.title} <Em>{copy.piece.titleEm}</Em>
          </Heading>
        </View>
        {preview ? (
          <View className="gap-2">
            <View className="w-full max-w-[300px] self-center">
              <Image source={preview} alt="" aspect="3:4" />
            </View>
            {filed && piece ? <Text className="text-center text-lg">{piece.label}</Text> : null}
            {!reading ? (
              <Button
                variant="quiet"
                className="self-center"
                onPress={() => {
                  reset();
                  setMenu(true);
                }}
              >
                {copy.piece.retake}
              </Button>
            ) : null}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.piece.add}
            onPress={() => setMenu(true)}
            className="aspect-[3/4] w-full max-w-[300px] items-center justify-center gap-3 self-center rounded-soft border border-border-control border-dashed bg-surface"
            testID="first-piece-well"
          >
            <Text tone="faint" italic>
              {copy.piece.keyPiece}
            </Text>
            <View className="rounded-pill border border-ink px-5 py-2">
              <Text
                size="caption"
                weight="medium"
                className="uppercase"
                style={{ letterSpacing: 1.9 }}
              >
                {copy.piece.add}
              </Text>
            </View>
          </Pressable>
        )}
        {message ? <ErrorText size="small">{message}</ErrorText> : null}
        <View className="border-hairline border-t" testID="ledger">
          {copy.piece.rows.map((row, i) => {
            const value = values && i < revealed ? values[i] : null;
            return (
              <View
                key={row}
                className="flex-row items-baseline gap-3 border-hairline border-b py-2"
              >
                <Text size="caption" tone="faint">
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Eyebrow className="flex-1">{row}</Eyebrow>
                <Text size="small" tone={value ? 'ink' : 'faint'} italic={!value}>
                  {value ??
                    (reading || (values && i === revealed)
                      ? copy.piece.readingRow
                      : copy.piece.awaiting)}
                </Text>
              </View>
            );
          })}
        </View>
        <PhotoMenu open={menu} onClose={() => setMenu(false)} onPick={add} />
      </FirstRunFrame>
    </PrimaryScope>
  );
}

function PhotoMenu({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (source: PhotoSource) => void;
}) {
  const muted = useColor('ink-muted');
  return (
    <Sheet open={open} onClose={onClose} title={copy.piece.add}>
      {(
        [
          ['camera', home.plus.camera, 'camera'],
          ['library', home.plus.upload, 'image'],
        ] as const
      ).map(([k, label, icon]) => (
        <Pressable
          key={k}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => onPick(k)}
          className="min-h-11 flex-row items-center gap-3 py-3"
        >
          <Icon name={icon} size={20} color={muted} />
          <Text>{label}</Text>
        </Pressable>
      ))}
    </Sheet>
  );
}

// Composing (legacy 1e): the lines take the looks' names and tick off, then the deck.
function Compose({ jobId, name }: { jobId: string; name: string | null }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const job = useApi(
    'jobs.get',
    { params: { id: jobId } },
    {
      refetchInterval: (q) =>
        isTerminal(q.state.data) || q.state.data?.output.setId ? false : JOB_REFRESH_MS,
    },
  );
  const setId = job.data?.output.setId ?? '';
  const set = useApi('looks.sets.get', { params: { id: setId } }, { enabled: Boolean(setId) });
  const titles = set.data?.looks.map((l) => l.name) ?? [];
  const [ticked, setTicked] = useState(0);
  const [capped, setCapped] = useState(false);
  const failed = job.data?.status === 'failed' || job.data?.status === 'cancelled';
  const landed = titles.length > 0 || capped || failed;

  useEffect(() => {
    const t = setTimeout(() => setCapped(true), COMPOSE_CAP_MS);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!landed) return;
    const t = setTimeout(
      () =>
        ticked >= 3
          ? router.replace({ pathname: '/looks/job/[jobId]', params: { jobId, from: 'home' } })
          : setTicked((n) => n + 1),
      LINE_MS,
    );
    return () => clearTimeout(t);
  }, [landed, ticked, router, jobId]);

  return (
    <View
      className="flex-1 justify-center gap-8 bg-bg px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      testID="composing"
    >
      <Heading size="md">
        {copy.compose.title} <Em>{copy.compose.titleEm(name)}</Em>
      </Heading>
      <View className="border-hairline border-t">
        {copy.compose.lines.map((line, i) => (
          <View key={line} className="flex-row justify-between gap-4 border-hairline border-b py-3">
            <Text tone={i <= ticked ? 'ink' : 'faint'}>{titles[i] ?? line}</Text>
            <Text size="small" tone="muted">
              {i < ticked ? '✓' : i === ticked ? copy.compose.dressing : ''}
            </Text>
          </View>
        ))}
      </View>
      <Text size="small" tone="muted">
        {copy.compose.foot}
      </Text>
    </View>
  );
}
