'use client';

import { useApi, useApiClient } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { home as copy, lookbook } from '@robes/copy';
import { isTripAsk } from '@robes/core/home';
import {
  ASK_MAX_CHARS,
  askDateFrom,
  type Balance,
  pieceNoun,
  readBalance,
} from '@robes/core/looks';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/web';
import { ErrorText, Eyebrow, IconButton, Text } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { useFeatures } from '@/components/features';
import { BalanceQuestion } from '@/components/looks/balance-question';
import { SwapSheet } from '@/components/looks/swap-sheet';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { formatDay, localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { usePhotoFiling } from '@/lib/file-photo';
import { PHOTO_ACCEPT } from '@/lib/upload';

type Attached = { kind: 'piece'; piece: Piece } | { kind: 'photo' };
type Steer = { balance: Balance } | { balanceNote: string };
type MenuKey = 'camera' | 'upload' | 'wardrobe';

const MENU: readonly (readonly [MenuKey, string, string, IconName])[] = [
  ['camera', copy.plus.camera, copy.plus.cameraHint, 'camera'],
  ['upload', copy.plus.upload, copy.plus.uploadHint, 'image'],
  ['wardrobe', copy.plus.wardrobe, copy.plus.wardrobeHint, 'wardrobe'],
];

// The new-look box (legacy _rbLookPrompt, mode new — HomePrompt 2026-10-15): her words become
// three suggested looks on the deck for the day they name. A piece by photograph or from the
// wardrobe sits INSIDE the box above her words and is the ask on its own: Send is three looks
// around it. Once per new look, while she has filed anything, the box asks where the pieces come
// from. The native twin is mobile/src/features/home/HomeBox.tsx.
export function HomeBox({
  placeholder = lookbook.prompt.doorNew,
  date = null,
  onDateClear,
  hasPieces,
  autoFocus = false,
  fromHome = true,
  initialPiece = null,
}: {
  placeholder?: string;
  // A day card's "Dress {weekday}" arms the box on that date.
  date?: string | null;
  onDateClear?: () => void;
  hasPieces: boolean;
  autoFocus?: boolean;
  // Home's own box: the deck's back lands home.
  fromHome?: boolean;
  // The piece page's door: the box opens with that piece already attached.
  initialPiece?: Piece | null;
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
  const [attached, setAttached] = useState<Attached | null>(
    initialPiece ? { kind: 'piece', piece: initialPiece } : null,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Her ask, held while the box asks where its pieces come from.
  const [held, setHeld] = useState<string | null>(null);
  const { track } = useAnalytics().analytics;
  const surface = fromHome ? 'home' : 'create';
  const { filing, file, reset } = usePhotoFiling();

  useEffect(() => {
    if (date || autoFocus) field.current?.focus();
  }, [date, autoFocus]);

  const piece = attached?.kind === 'piece' ? attached.piece : null;
  const filedPiece = filing.phase === 'filed' ? filing.piece : null;
  const stillFiling = filing.phase === 'uploading' || filing.phase === 'reading';
  const pieceForSend = piece ?? filedPiece;

  const clearPiece = () => {
    setAttached(null);
    if (held !== null) setText(held);
    setHeld(null);
    reset();
  };

  // Once per new look, while she has filed anything: the ask waits for her answer.
  const holdFor = (words: string, steer: Steer | undefined) => {
    if (steer || !(hasPieces || pieceForSend)) return false;
    track('balance_asked', { surface, piece: pieceForSend !== null });
    setHeld(words);
    setText('');
    return true;
  };
  const failed = (err: unknown, words: string) => {
    track('prompt_submitted', {
      surface,
      intent: attached ? 'piece' : 'words',
      scope: date ? 'day' : 'none',
      ok: false,
    });
    setBusy(null);
    if (held !== null) setText(words);
    setHeld(null);
    setError(errorCopy(err));
  };

  async function send(steer?: Steer) {
    if (busy) return;
    if (held !== null && !steer) {
      const read = readBalance(text);
      if (read.balance) void send({ balance: read.balance });
      else if (read.note) void send({ balanceNote: read.note });
      return;
    }
    const words = (held ?? text).trim();
    setError(null);
    if (steer)
      track('balance_answered', { surface, balance: 'balance' in steer ? steer.balance : 'words' });
    if (attached) {
      if (stillFiling) {
        setWaiting(true);
        return;
      }
      if (!pieceForSend) {
        setError(copy.plus.notFiled);
        return;
      }
      if (holdFor(words, steer)) return;
      setBusy(lookbook.prompt.busyRead);
      try {
        const { jobId } = await api.call('looks.generate', {
          input: {
            anchor: { type: 'piece', pieceId: pieceForSend.id },
            ...(words ? { occasion: words.slice(0, 120) } : {}),
            ...steer,
          },
        });
        track('prompt_submitted', { surface, intent: 'piece', scope: 'none', ok: true });
        router.push(`/looks/style/${jobId}${fromHome ? '?from=home' : ''}`);
      } catch (err) {
        failed(err, words);
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
    if (holdFor(words, steer)) return;
    setBusy(lookbook.prompt.busyRead);
    try {
      const { jobId } = await api.call('looks.prompt', {
        input: { prompt: words, ...(day ? { date: day } : {}), ...steer },
      });
      track('prompt_submitted', {
        surface,
        intent: 'words',
        scope: day ? 'day' : 'none',
        ok: true,
      });
      router.push(`/looks/style/${jobId}${fromHome ? '?from=home' : ''}`);
    } catch (err) {
      failed(err, words);
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
    if (e.key === 'Escape') setMenu(false);
  };
  const onPhoto = (f: File | undefined) => {
    if (!f) return;
    setAttached({ kind: 'photo' });
    void file(f);
  };
  const pick = (k: MenuKey) => {
    setMenu(false);
    if (k === 'camera') camera.current?.click();
    else if (k === 'upload') upload.current?.click();
    else if (!hasPieces) setError(copy.plus.emptyWardrobe);
    else setPicking(true);
  };

  // While a photograph is read the card says so; once filed it names the piece.
  const reading = attached?.kind === 'photo' && !filedPiece && filing.phase !== 'none';
  const cardName =
    piece?.label ?? filedPiece?.label ?? (reading ? copy.plus.reading : copy.plus.newPiece);
  const cardSub = piece
    ? copy.plus.inWardrobe(piece.categoryL2 ?? piece.category)
    : filing.phase === 'filed'
      ? copy.plus.filedTo(filing.piece.categoryL2 ?? filing.piece.category)
      : filing.phase === 'none'
        ? copy.plus.nothingFound
        : filing.phase === 'failed'
          ? copy.plus.notFiled
          : copy.plus.readingSub;
  const fieldHint =
    held !== null
      ? lookbook.prompt.balance.typed
      : pieceForSend
        ? copy.plus.styleFor(pieceNoun(pieceForSend.label))
        : attached
          ? copy.plus.placeholder
          : date
            ? copy.doorDay(formatDay(date))
            : placeholder;
  // A piece is the ask on its own: the arrow is ready the moment it lands.
  const ready = held !== null ? text.trim().length > 0 : attached ? true : text.trim().length >= 2;
  // The box opens to 24px corners on the warm edge once it holds a piece or a question.
  const open = attached !== null || held !== null;

  const plus = (
    <div className="relative shrink-0">
      <IconButton
        icon={menu ? 'close' : 'plus'}
        label={copy.plus.label}
        aria-haspopup="menu"
        aria-expanded={menu}
        onClick={() => setMenu((m) => !m)}
        framed
        className={menu ? 'bg-surface-sunk' : undefined}
      />
      {menu ? (
        <div
          role="menu"
          aria-label={copy.plus.label}
          className={`absolute left-0 z-20 flex w-[286px] flex-col rounded-soft border border-hairline bg-surface-raised p-2 shadow-[0_10px_30px_color-mix(in_srgb,var(--color-ink)_10%,transparent)] ${open ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          <Eyebrow className="px-3 pt-2 pb-1 text-accent-inspire">{copy.plus.label}</Eyebrow>
          {MENU.map(([k, label, hint, icon]) => (
            <div key={k}>
              {k === 'wardrobe' ? <hr className="mx-3 my-1 border-hairline" /> : null}
              <button
                type="button"
                role="menuitem"
                onClick={() => pick(k)}
                className="flex w-full items-center gap-3 rounded-crisp px-3 py-2 text-left hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus-ring"
              >
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-pill bg-surface text-ink">
                  <Icon name={icon} size={16} />
                </span>
                <span className="flex flex-col">
                  <span className="font-sans text-sm text-ink">{label}</span>
                  <span className="font-display text-ink-muted text-sm italic">{hint}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
  const sendButton = (
    <IconButton
      icon={ready ? 'send' : 'looks'}
      label={lookbook.prompt.send}
      onClick={() => void send()}
      disabled={busy !== null}
      className={ready ? 'bg-ink text-bg hover:text-bg' : undefined}
    />
  );
  const textarea = (
    <>
      <label htmlFor={id} className="sr-only">
        {fieldHint}
      </label>
      <textarea
        ref={field}
        id={id}
        rows={1}
        value={text}
        maxLength={ASK_MAX_CHARS}
        placeholder={fieldHint}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={busy !== null}
        className="max-h-24 min-h-10 flex-1 resize-none bg-transparent py-2 font-display text-[19px] font-light italic text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </>
  );

  return (
    <fieldset
      aria-label={lookbook.prompt.newLabel}
      className="flex min-w-0 flex-col gap-2"
      data-testid="home-box"
    >
      {open ? (
        <div className="relative flex flex-col gap-3 rounded-[24px] border border-selected-line bg-surface-raised p-3 has-[textarea:focus-visible]:border-ink shadow-[0_6px_20px_color-mix(in_srgb,var(--color-ink)_6%,transparent)]">
          {attached ? (
            <div
              className="flex items-center gap-3 rounded-soft border border-hairline bg-bg p-2"
              data-testid="box-piece"
            >
              <div
                className={`w-10 shrink-0 overflow-hidden rounded-crisp ${reading ? 'animate-pulse' : ''}`}
              >
                {piece ? (
                  <PieceImage piece={piece} sizes="40px" />
                ) : filing.phase !== 'idle' ? (
                  // biome-ignore lint/performance/noImgElement: a local object URL preview
                  <img src={filing.preview} alt="" className="aspect-[4/5] w-full object-cover" />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <Text className="truncate font-display text-lg">{cardName}</Text>
                <Text size="caption" tone="muted" className="truncate" role="status">
                  {cardSub}
                </Text>
              </div>
              <IconButton icon="close" label={copy.plus.remove} onClick={clearPiece} />
            </div>
          ) : null}
          {held !== null ? (
            <BalanceQuestion
              echo={held}
              disabled={busy !== null}
              onPick={(b) => void send({ balance: b })}
            />
          ) : null}
          <div className={held !== null ? 'border-hairline border-t pt-2' : undefined}>
            {textarea}
          </div>
          <div className="flex items-center justify-between">
            {plus}
            {sendButton}
          </div>
        </div>
      ) : (
        // Beta's prompt at rest: a one-line white pill on the fine edge, the + circle at its left.
        <div className="relative flex min-h-[54px] items-center gap-2 rounded-[27px] border border-rule-mid bg-surface-raised py-[4px] pr-1 pl-[4px]">
          {plus}
          {textarea}
          {date && onDateClear ? (
            <IconButton icon="close" label={formatDay(date)} onClick={onDateClear} />
          ) : null}
          {sendButton}
        </div>
      )}
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
      {busy || waiting ? (
        <Text size="small" tone="muted" italic role="status">
          {waiting ? copy.plus.filing : busy}
        </Text>
      ) : null}
      {error ? <ErrorText size="caption">{error}</ErrorText> : null}
      <SwapSheet
        open={picking}
        swapping={null}
        onRack={[]}
        onClose={() => setPicking(false)}
        onPick={(p) => {
          reset();
          setAttached({ kind: 'piece', piece: p });
          field.current?.focus();
        }}
      />
    </fieldset>
  );
}

// The same box on the doors that are not home (the empty Suggested tab, the Create sheet): it
// asks the balance question whenever she has filed anything, like home's.
export function NewLookBox({ date, autoFocus = false }: { date?: string; autoFocus?: boolean }) {
  const pieces = useApi('wardrobe.list', { input: { limit: 1 } });
  return (
    <HomeBox
      date={date ?? null}
      autoFocus={autoFocus}
      fromHome={false}
      hasPieces={(pieces.data?.items.length ?? 0) > 0}
    />
  );
}
