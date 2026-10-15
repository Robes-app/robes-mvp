'use client';

import { useApiClient } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { home as copy, lookbook } from '@robes/copy';
import { isTripAsk } from '@robes/core/home';
import { ASK_MAX_CHARS, askDateFrom } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { IconButton, Text } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { useFeatures } from '@/components/features';
import { SwapSheet } from '@/components/looks/swap-sheet';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { formatDay, localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { usePhotoFiling } from '@/lib/file-photo';
import { PHOTO_ACCEPT } from '@/lib/upload';

type Attached = { kind: 'piece'; piece: Piece } | { kind: 'photo' };
type Mode = 'build' | 'three';

// H2, the home box (legacy _rbHbSync + the + inside the box, 2026-10-05): her words become three
// suggested looks on the deck, for the day they name; a piece attached by photograph or from the
// wardrobe is built into a look or styled three ways.
export function HomeBox({
  placeholder,
  date,
  onDateClear,
  hasPieces,
}: {
  placeholder: string;
  // A day card's "Dress {weekday}" arms the box on that date.
  date: string | null;
  onDateClear: () => void;
  hasPieces: boolean;
}) {
  const router = useRouter();
  const api = useApiClient();
  const features = useFeatures();
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [picking, setPicking] = useState(false);
  const [attached, setAttached] = useState<Attached | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [nudge, setNudge] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { filing, file, reset } = usePhotoFiling();

  useEffect(() => {
    if (date) field.current?.focus();
  }, [date]);

  const piece = attached?.kind === 'piece' ? attached.piece : null;
  const filedPiece = filing.phase === 'filed' ? filing.piece : null;
  const stillFiling = filing.phase === 'uploading' || filing.phase === 'reading';
  const pieceForSend = piece ?? filedPiece;
  const place = date ? copy.doorDay(formatDay(date)) : placeholder;

  const clearPiece = () => {
    setAttached(null);
    setMode(null);
    reset();
  };

  async function send() {
    if (busy) return;
    const words = text.trim();
    setError(null);
    if (attached) {
      if (!mode) {
        setNudge(true);
        return;
      }
      if (stillFiling) {
        setWaiting(true);
        return;
      }
      if (!pieceForSend) {
        setError(copy.plus.notFiled);
        return;
      }
      if (mode === 'build') {
        router.push(`/looks/new?pieceId=${pieceForSend.id}`);
        return;
      }
      setBusy(lookbook.prompt.busyRead);
      try {
        const { jobId } = await api.call('looks.generate', {
          input: {
            anchor: { type: 'piece', pieceId: pieceForSend.id },
            ...(words ? { occasion: words.slice(0, 120) } : {}),
          },
        });
        router.push(`/looks/style/${jobId}?from=home`);
      } catch (err) {
        setBusy(null);
        setError(errorCopy(err));
      }
      return;
    }
    if (words.length < 2) return;
    const trip = !date && isTripAsk(words);
    if (trip && features.trips) {
      router.push(`/trip/new?brief=${encodeURIComponent(words)}`);
      return;
    }
    const day = date ?? (trip ? null : askDateFrom(words, localToday()));
    setBusy(lookbook.prompt.busyRead);
    try {
      const { jobId } = await api.call('looks.prompt', {
        input: { prompt: words, ...(day ? { date: day } : {}) },
      });
      router.push(`/looks/style/${jobId}?from=home`);
    } catch (err) {
      setBusy(null);
      setError(errorCopy(err));
    }
  }

  // A photograph still filing is waited on once she has sent.
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    if (waiting && !stillFiling) {
      setWaiting(false);
      void sendRef.current();
    }
  }, [waiting, stillFiling]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };
  const onPhoto = (f: File | undefined) => {
    if (!f) return;
    setAttached({ kind: 'photo' });
    setMode(null);
    void file(f);
  };
  const photoSub =
    filing.phase === 'filed'
      ? copy.plus.filedTo(filing.piece.categoryL2 ?? filing.piece.category)
      : filing.phase === 'none'
        ? copy.plus.nothingFound
        : filing.phase === 'failed'
          ? copy.plus.notFiled
          : copy.plus.justTaken;

  const ready = attached ? mode !== null : text.trim().length >= 2;
  return (
    <section
      aria-label={lookbook.prompt.newLabel}
      className="flex flex-col gap-2"
      data-testid="home-box"
    >
      {attached ? (
        <div
          className={`flex flex-col gap-3 rounded-soft border bg-surface p-3 ${nudge ? 'border-accent-warm' : 'border-hairline'}`}
          data-testid="box-piece"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 shrink-0 overflow-hidden rounded-crisp">
              {piece ? (
                <PieceImage piece={piece} sizes="48px" />
              ) : filing.phase !== 'idle' ? (
                // biome-ignore lint/performance/noImgElement: a local object URL preview
                <img src={filing.preview} alt="" className="aspect-[4/5] w-full object-cover" />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <Text className="truncate">
                {piece?.label ?? filedPiece?.label ?? copy.plus.newPiece}
              </Text>
              <Text size="caption" tone="muted" className="truncate" role="status">
                {piece ? copy.plus.inWardrobe(piece.categoryL2 ?? piece.category) : photoSub}
              </Text>
            </div>
            <IconButton icon="close" label={copy.plus.remove} onClick={clearPiece} />
          </div>
          <Text size="caption" tone="muted" className="uppercase tracking-wider">
            {copy.plus.styleThis}
          </Text>
          <div className="grid grid-cols-2 gap-2">
            {(['build', 'three'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  setNudge(false);
                }}
                className={`flex flex-col items-start gap-0.5 rounded-crisp border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-focus-ring ${mode === m ? 'border-ink' : 'border-hairline'}`}
              >
                <span className="font-sans text-sm text-ink">{copy.plus[m].title}</span>
                <span className="font-sans text-ink-muted text-xs">{copy.plus[m].line}</span>
              </button>
            ))}
          </div>
          {nudge ? (
            <Text size="caption" tone="muted" role="status">
              {copy.plus.pickMode}
            </Text>
          ) : null}
        </div>
      ) : null}
      <div className="relative flex items-end gap-2 rounded-soft border border-hairline bg-surface px-2 py-2">
        <IconButton
          icon="plus"
          label={copy.plus.label}
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => setMenu((m) => !m)}
        />
        <label htmlFor={id} className="sr-only">
          {attached ? copy.plus.placeholder : place}
        </label>
        <textarea
          ref={field}
          id={id}
          rows={1}
          value={text}
          maxLength={ASK_MAX_CHARS}
          placeholder={attached ? copy.plus.placeholder : place}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy !== null}
          className="max-h-24 min-h-10 flex-1 resize-none bg-transparent py-2 font-display text-lg italic text-ink placeholder:text-ink-muted focus:outline-none"
        />
        {date && !attached ? (
          <IconButton icon="close" label={formatDay(date)} onClick={onDateClear} />
        ) : null}
        <IconButton
          icon={ready ? 'send' : 'looks'}
          label={lookbook.prompt.send}
          onClick={() => void send()}
          disabled={busy !== null}
        />
        {menu ? (
          <div
            role="menu"
            aria-label={copy.plus.label}
            className="absolute top-full left-0 z-10 mt-2 flex w-64 flex-col rounded-soft border border-hairline bg-surface p-1 shadow-sm"
          >
            {(
              [
                ['camera', copy.plus.camera, copy.plus.cameraHint, 'camera'],
                ['upload', copy.plus.upload, null, 'image'],
                ['wardrobe', copy.plus.wardrobe, null, 'wardrobe'],
              ] as const
            ).map(([k, label, hint, icon]) => (
              <button
                key={k}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  if (k === 'camera') camera.current?.click();
                  else if (k === 'upload') upload.current?.click();
                  else if (!hasPieces) setError(copy.plus.emptyWardrobe);
                  else setPicking(true);
                }}
                className="flex items-start gap-3 rounded-crisp px-3 py-2 text-left hover:bg-surface-sunk focus-visible:outline-2 focus-visible:outline-focus-ring"
              >
                <Icon name={icon} size={18} className="mt-0.5 text-ink-muted" />
                <span className="flex flex-col">
                  <span className="font-sans text-sm text-ink">{label}</span>
                  {hint ? <span className="font-sans text-ink-muted text-xs">{hint}</span> : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <input
          ref={camera}
          type="file"
          accept={PHOTO_ACCEPT}
          capture="environment"
          hidden
          onChange={(e) => {
            onPhoto(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <input
          ref={upload}
          type="file"
          accept={PHOTO_ACCEPT}
          hidden
          data-testid="box-upload"
          onChange={(e) => {
            onPhoto(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {busy || waiting ? (
        <Text size="small" tone="muted" className="italic" role="status">
          {waiting ? copy.plus.filing : busy}
        </Text>
      ) : null}
      {error ? (
        <Text size="caption" tone="danger" role="alert">
          {error}
        </Text>
      ) : null}
      <SwapSheet
        open={picking}
        swapping={null}
        onRack={[]}
        onClose={() => setPicking(false)}
        onPick={(p) => {
          reset();
          setAttached({ kind: 'piece', piece: p });
          setMode(null);
        }}
      />
    </section>
  );
}
