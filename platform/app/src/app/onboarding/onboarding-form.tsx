'use client';

import { useApi, useApiClient } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { firstRun as copy, onboarding } from '@robes/copy';
import { Button, ErrorText, Eyebrow, Field, Heading, Text, Wordmark } from '@robes/ui';
import { useRouter } from 'next/navigation';
import {
  type DragEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { usePhotoFiling } from '@/lib/file-photo';
import { PHOTO_ACCEPT } from '@/lib/upload';
import { useJob } from '@/lib/use-job';

type Stage = 'splash' | 'name' | 'piece' | 'compose';
const SPLASH_MS = 2_000;
const REVEAL_MS = 480;
const COMPOSE_CAP_MS = 20_000;
const LINE_MS = 700;

const firstWord = (name: string): string | null => name.trim().split(/\s+/)[0] || null;

// The cream frame (legacy 1b/1c): back · wordmark · one three-segment rule (1 name, 2 piece,
// 3 filed) · the body · the footer.
function Frame({
  segs,
  onBack,
  children,
  footer,
}: {
  segs: number;
  onBack?: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-6 py-6">
      <header className="grid grid-cols-3 items-center">
        <span>
          {onBack ? (
            <Button variant="quiet" onClick={onBack} className="-ml-2">
              {copy.back}
            </Button>
          ) : null}
        </span>
        <Wordmark className="text-center" />
        <span />
      </header>
      <div
        className="grid grid-cols-3 gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={segs}
        aria-label={copy.progress(segs, 3)}
      >
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-px ${n <= segs ? 'bg-ink' : 'bg-hairline'}`} />
        ))}
      </div>
      <main className="flex flex-1 flex-col gap-6">{children}</main>
      <footer className="flex flex-col items-stretch gap-3">{footer}</footer>
    </div>
  );
}

// Splash → name → the first piece, read live → Composing → the deck (legacy 0478e63: the intent
// fork and Dress-me-today are gone; home does the rest of the onboarding, one module at a time).
export function OnboardingForm({ initialFirstName }: { initialFirstName: string }) {
  const router = useRouter();
  const api = useApiClient();
  const [stage, setStage] = useState<Stage>('splash');
  const [name, setName] = useState(initialFirstName);
  const [saved, setSaved] = useState(initialFirstName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const styled = useRef<{ pieceId: string; jobId: string } | null>(null);

  useEffect(() => {
    if (stage !== 'splash') return;
    const t = setTimeout(() => setStage('name'), SPLASH_MS);
    return () => clearTimeout(t);
  }, [stage]);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    const first = firstWord(name);
    if (!first) return;
    setError(null);
    if (first !== saved) {
      setBusy(true);
      try {
        await api.call('me.update', { input: { firstName: first } });
        setSaved(first);
      } catch {
        setError(onboarding.failed);
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setStage('piece');
  }

  async function complete(): Promise<void> {
    await api.call('me.onboarding.complete');
  }

  if (stage === 'splash') {
    return (
      <button
        type="button"
        onClick={() => setStage('name')}
        className="flex min-h-dvh w-full items-center justify-center bg-ink text-bg"
      >
        <Wordmark className="text-5xl" />
      </button>
    );
  }

  if (stage === 'compose' && jobId) {
    return <Compose jobId={jobId} name={firstWord(name)} />;
  }

  if (stage === 'piece') {
    return (
      <FirstPiece
        name={firstWord(name)}
        onBack={() => setStage('name')}
        onSkip={async () => {
          await complete();
          router.replace('/');
          router.refresh();
        }}
        onStyle={async (piece) => {
          // A retry after a failed finish reuses the job: never a second generation (or quota).
          const kept = styled.current?.pieceId === piece.id ? styled.current.jobId : null;
          const jobId =
            kept ??
            (
              await api.call('looks.generate', {
                input: { anchor: { type: 'piece', pieceId: piece.id } },
              })
            ).jobId;
          styled.current = { pieceId: piece.id, jobId };
          await complete();
          setJobId(jobId);
          setStage('compose');
        }}
      />
    );
  }

  return (
    <form onSubmit={saveName}>
      <Frame
        segs={1}
        footer={
          <Button
            variant="primary"
            type="submit"
            disabled={!name.trim()}
            loading={busy}
            loadingLabel={onboarding.saving}
          >
            {copy.name.continue}
          </Button>
        }
      >
        <div className="flex flex-col gap-2 pt-8">
          <Eyebrow>{copy.name.eyebrow}</Eyebrow>
          <Heading level={1}>
            {copy.name.title} <em>{copy.name.titleEm}</em>
          </Heading>
        </div>
        <Field
          label={copy.name.label}
          name="firstName"
          autoComplete="given-name"
          placeholder={copy.name.placeholder}
          required
          maxLength={60}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />
        <Text size="small" tone="muted">
          {copy.name.notes}
        </Text>
      </Frame>
    </form>
  );
}

// The first piece (legacy 1c): the photograph lands in the well, Robes reads it, the five ledger
// rows fill one at a time, then the one CTA. Skip takes two taps.
function FirstPiece({
  name,
  onBack,
  onSkip,
  onStyle,
}: {
  name: string | null;
  onBack: () => void;
  onSkip: () => Promise<void>;
  onStyle: (piece: Piece) => Promise<void>;
}) {
  const inputId = useId();
  const { filing, file, reset } = usePhotoFiling();
  const [revealed, setRevealed] = useState(0);
  const [skipArmed, setSkipArmed] = useState(false);
  const [leaving, setLeaving] = useState<'style' | 'skip' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const piece = filing.phase === 'filed' ? filing.piece : null;
  const reading = filing.phase === 'uploading' || filing.phase === 'reading';

  useEffect(() => {
    if (!piece) {
      setRevealed(0);
      return;
    }
    const t = setInterval(
      () =>
        setRevealed((n) => {
          if (n + 1 >= copy.piece.rows.length) clearInterval(t);
          return Math.min(n + 1, copy.piece.rows.length);
        }),
      REVEAL_MS,
    );
    return () => clearInterval(t);
  }, [piece]);

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

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!PHOTO_ACCEPT.split(',').includes(f.type)) {
      setError(copy.piece.unreadable);
      return;
    }
    setError(null);
    void file(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    pick(e.dataTransfer.files[0]);
  };

  const eyebrow = piece
    ? copy.piece.filed
    : reading
      ? copy.piece.reading
      : copy.piece.eyebrow(name);
  return (
    <Frame
      segs={piece ? 3 : 2}
      onBack={onBack}
      footer={
        filed && piece ? (
          <Button
            variant="primary"
            loading={leaving === 'style'}
            loadingLabel={copy.piece.filing}
            onClick={() => {
              setLeaving('style');
              onStyle(piece).catch(() => {
                setLeaving(null);
                setError(copy.piece.failed);
              });
            }}
          >
            {copy.piece.style}
          </Button>
        ) : reading || piece ? (
          <Text tone="muted" className="text-center" role="status">
            {copy.piece.wait}
          </Text>
        ) : (
          <Button
            variant="quiet"
            loading={leaving === 'skip'}
            onClick={() => {
              if (!skipArmed) {
                setSkipArmed(true);
                return;
              }
              setLeaving('skip');
              onSkip().catch(() => {
                setLeaving(null);
                setError(onboarding.failed);
              });
            }}
          >
            {skipArmed ? copy.piece.skipAnyway : copy.piece.skip}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading level={1} size="xl">
          {copy.piece.title} <em>{copy.piece.titleEm}</em>
        </Heading>
      </div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        data-testid="first-piece-well"
        className={`relative flex aspect-[4/5] w-full cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-soft border ${
          preview ? 'border-hairline' : 'border-border-control border-dashed'
        } ${over ? 'bg-surface-sunk' : 'bg-surface'} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring`}
      >
        {preview ? (
          // biome-ignore lint/performance/noImgElement: a local object URL preview
          <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <span className="font-sans text-ink-muted text-xs uppercase tracking-[0.2em]">
              {copy.piece.keyPiece}
            </span>
            <span className="rounded-pill border border-ink px-5 py-2 font-sans text-sm text-ink">
              {copy.piece.add}
            </span>
          </>
        )}
        {reading ? (
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-px animate-pulse bg-ink" />
        ) : null}
        {filed && piece ? (
          <span className="absolute inset-x-3 bottom-3 rounded-crisp bg-surface px-3 py-2 text-center font-display text-lg">
            {piece.label}
          </span>
        ) : null}
        <input
          id={inputId}
          type="file"
          accept={PHOTO_ACCEPT}
          className="sr-only"
          disabled={reading}
          aria-label={copy.piece.add}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      {preview && !reading ? (
        <Button
          variant="quiet"
          className="self-center"
          onClick={() => {
            reset();
            setError(null);
            document.getElementById(inputId)?.click();
          }}
        >
          {copy.piece.retake}
        </Button>
      ) : null}
      {message ? <ErrorText>{message}</ErrorText> : null}
      <dl
        className="flex flex-col divide-y divide-hairline border-hairline border-y"
        data-testid="ledger"
      >
        {copy.piece.rows.map((row, i) => {
          const value = values && i < revealed ? values[i] : null;
          return (
            <div key={row} className="flex items-baseline gap-3 py-2">
              <span className="font-sans text-ink-faint text-xs tracking-[0.2em]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <dt className="flex-1 font-medium font-sans text-ink-muted text-xs uppercase tracking-[0.2em]">
                {row}
              </dt>
              <dd
                className={
                  value
                    ? 'font-sans text-ink text-sm'
                    : 'font-display text-ink-faint text-lg italic'
                }
              >
                {value ??
                  (reading || (values && i === revealed)
                    ? copy.piece.readingRow
                    : copy.piece.awaiting)}
              </dd>
            </div>
          );
        })}
      </dl>
    </Frame>
  );
}

// Composing (legacy 1e): the wait becomes anticipation; the lines take the looks' names and tick
// off, then the deck opens on the three looks with its way back home.
function Compose({ jobId, name }: { jobId: string; name: string | null }) {
  const router = useRouter();
  const { job } = useJob(jobId);
  const setId = job?.output.setId ?? null;
  const { data: set } = useApi(
    'looks.sets.get',
    { params: { id: setId ?? '00000000-0000-4000-8000-000000000000' } },
    { enabled: Boolean(setId) },
  );
  const titles = set?.looks.map((l) => l.name) ?? [];
  const [ticked, setTicked] = useState(0);
  const [capped, setCapped] = useState(false);
  const failed = job?.status === 'failed' || job?.status === 'cancelled';
  const landed = titles.length > 0 || capped || failed;
  const deck = `/looks/style/${jobId}?from=home`;

  useEffect(() => {
    const t = setTimeout(() => setCapped(true), COMPOSE_CAP_MS);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!landed) return;
    if (ticked >= 3) {
      const t = setTimeout(() => router.replace(deck), LINE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTicked((n) => n + 1), LINE_MS);
    return () => clearTimeout(t);
  }, [landed, ticked, router, deck]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6">
      <Heading level={1} size="xl">
        {copy.compose.title} <em>{copy.compose.titleEm(name)}</em>
      </Heading>
      <ol
        className="flex flex-col divide-y divide-hairline border-hairline border-y"
        aria-live="polite"
      >
        {copy.compose.lines.map((line, i) => (
          <li key={line} className="flex justify-between gap-4 py-3">
            <Text className={i <= ticked ? 'text-ink' : 'text-ink-faint'}>{titles[i] ?? line}</Text>
            <Text size="small" tone="muted">
              {i < ticked ? '✓' : i === ticked ? copy.compose.dressing : ''}
            </Text>
          </li>
        ))}
      </ol>
      <Text size="small" tone="muted">
        {copy.compose.foot}
      </Text>
    </div>
  );
}
