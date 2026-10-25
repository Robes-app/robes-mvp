import { useApiClient } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { home as copy, lookbook } from '@robes/copy';
import { isTripAsk } from '@robes/core/home';
import { ASK_MAX_CHARS, askDateFrom, type Balance, readBalance } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { ErrorText, fonts, IconButton, Image, Sheet, Text, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, TextInput, type TextInputInstance, View } from 'react-native';
import { BalanceQuestion } from '@/features/looks/BalanceQuestion';
import { SwapSheet } from '@/features/looks/SwapSheet';
import { localDate } from '@/features/looks/saved-looks';
import { dayLabel } from '@/features/plan/plan';
import { errorMessage } from '@/lib/errors';
import { useFeatures } from '@/lib/features';
import { renditionUri } from '@/lib/images';
import { type PhotoSource, pickOne, usePhotoFiling } from './file-photo';

type Mode = 'build' | 'three';
type Steer = { balance: Balance } | { balanceNote: string };
export type HomeBoxHandle = { focus: () => void };

// H2, the home box (legacy _rbHbSync + the + inside the box): her words become three suggested
// looks on the deck for the day they name; a piece by photograph or from the wardrobe is built
// into a look or styled three ways.
export const HomeBox = forwardRef<
  HomeBoxHandle,
  { placeholder: string; date: string | null; onDateClear: () => void; hasPieces: boolean }
>(function HomeBox({ placeholder, date, onDateClear, hasPieces }, ref) {
  const router = useRouter();
  const api = useApiClient();
  const { features } = useFeatures();
  const input = useRef<TextInputInstance>(null);
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [picking, setPicking] = useState(false);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [photo, setPhoto] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [nudge, setNudge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Her ask, held while the box asks where its pieces come from.
  const [held, setHeld] = useState<string | null>(null);
  const { filing, file, reset } = usePhotoFiling();
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));

  const attached = piece !== null || photo;
  const filedPiece = filing.phase === 'filed' ? filing.piece : null;
  const stillFiling = filing.phase === 'uploading' || filing.phase === 'reading';
  const forSend = piece ?? filedPiece;
  const place =
    held !== null
      ? lookbook.prompt.balance.typed
      : attached
        ? copy.plus.placeholder
        : date
          ? copy.doorDay(dayLabel(date))
          : placeholder;

  const clear = () => {
    setPiece(null);
    setPhoto(false);
    setMode(null);
    setHeld(null);
    reset();
  };

  // Once per new look, while she has filed anything: the ask waits for her answer.
  const holdFor = (words: string, steer: Steer | undefined) => {
    if (steer || !(hasPieces || forSend)) return false;
    setHeld(words);
    setText('');
    return true;
  };
  const failed = (err: unknown, words: string) => {
    if (held !== null) setText(words);
    setHeld(null);
    setError(errorMessage(err));
  };

  async function send(steer?: Steer): Promise<void> {
    if (busy) return;
    if (held !== null && !steer) {
      const read = readBalance(text);
      if (read.balance) void send({ balance: read.balance });
      else if (read.note) void send({ balanceNote: read.note });
      return;
    }
    const words = (held ?? text).trim();
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
      if (!forSend) {
        setError(copy.plus.notFiled);
        return;
      }
      if (mode === 'build') {
        router.push({ pathname: '/looks/new', params: { pieceId: forSend.id } });
        clear();
        return;
      }
      if (holdFor(words, steer)) return;
      setBusy(true);
      try {
        const { jobId } = await api.call('looks.generate', {
          input: {
            anchor: { type: 'piece', pieceId: forSend.id },
            ...(words ? { occasion: words.slice(0, 120) } : {}),
            ...steer,
          },
        });
        setText('');
        clear();
        router.push({ pathname: '/looks/job/[jobId]', params: { jobId, from: 'home' } });
      } catch (err) {
        failed(err, words);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (words.length < 2) return;
    const trip = !date && isTripAsk(words);
    if (trip && features.trips) {
      router.push({ pathname: '/trip/new', params: { brief: words } });
      return;
    }
    const day = date ?? (trip ? null : askDateFrom(words, localDate()));
    if (holdFor(words, steer)) return;
    setBusy(true);
    try {
      const { jobId } = await api.call('looks.prompt', {
        input: { prompt: words, ...(day ? { date: day } : {}), ...steer },
      });
      setText('');
      setHeld(null);
      onDateClear();
      router.push({ pathname: '/looks/job/[jobId]', params: { jobId, from: 'home' } });
    } catch (err) {
      failed(err, words);
    } finally {
      setBusy(false);
    }
  }
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    if (waiting && !stillFiling) {
      setWaiting(false);
      void sendRef.current();
    }
  }, [waiting, stillFiling]);

  const addPhoto = async (source: PhotoSource) => {
    setMenu(false);
    const picked = await pickOne(source);
    if (picked === 'denied' || !picked) return;
    setPiece(null);
    setPhoto(true);
    setMode(null);
    void file(picked);
  };

  const sub = piece
    ? copy.plus.inWardrobe(piece.categoryL2 ?? piece.category)
    : filing.phase === 'filed'
      ? copy.plus.filedTo(filing.piece.categoryL2 ?? filing.piece.category)
      : filing.phase === 'none'
        ? copy.plus.nothingFound
        : filing.phase === 'failed'
          ? copy.plus.notFiled
          : copy.plus.justTaken;
  const thumb = piece
    ? renditionUri(piece.image, 48)
    : filing.phase !== 'idle'
      ? filing.preview
      : null;
  const ready =
    held !== null ? text.trim().length > 0 : attached ? mode !== null : text.trim().length >= 2;

  return (
    <View className="gap-2" testID="home-box">
      {attached ? (
        <View
          className={`gap-3 rounded-[12px] border bg-surface-raised p-3 ${nudge ? 'border-accent-warm' : 'border-hairline'}`}
          testID="box-piece"
        >
          <View className="flex-row items-center gap-3">
            <View style={{ width: 48 }}>{thumb ? <Image source={thumb} alt="" /> : null}</View>
            <View className="flex-1">
              <Text numberOfLines={1}>
                {piece?.label ?? filedPiece?.label ?? copy.plus.newPiece}
              </Text>
              <Text size="caption" tone="muted" numberOfLines={1}>
                {sub}
              </Text>
            </View>
            <IconButton icon="close" label={copy.plus.remove} onPress={clear} tone="ink-muted" />
          </View>
          <Text size="caption" tone="muted" className="uppercase">
            {copy.plus.styleThis}
          </Text>
          <View className="flex-row gap-2">
            {(['build', 'three'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m }}
                accessibilityLabel={copy.plus[m].title}
                onPress={() => {
                  setMode(m);
                  setNudge(false);
                }}
                className={`flex-1 gap-0.5 rounded-crisp border px-3 py-2 ${mode === m ? 'border-ink' : 'border-hairline'}`}
              >
                <Text size="small">{copy.plus[m].title}</Text>
                <Text size="caption" tone="muted">
                  {copy.plus[m].line}
                </Text>
              </Pressable>
            ))}
          </View>
          {nudge ? (
            <Text size="caption" tone="muted">
              {copy.plus.pickMode}
            </Text>
          ) : null}
        </View>
      ) : null}
      {held !== null ? (
        <BalanceQuestion echo={held} disabled={busy} onPick={(b) => void send({ balance: b })} />
      ) : null}
      {/* Beta's prompt: a one-line white pill on the fine edge, the + circle at its left. */}
      <View className="min-h-[54px] flex-row items-center gap-2 rounded-[27px] border border-rule-mid bg-surface-raised py-[5px] pr-1 pl-[5px]">
        <IconButton icon="plus" label={copy.plus.label} onPress={() => setMenu(true)} framed />
        <TextInput
          ref={input}
          accessibilityLabel={place}
          placeholder={place}
          placeholderTextColor={faint}
          value={text}
          onChangeText={setText}
          maxLength={ASK_MAX_CHARS}
          multiline
          submitBehavior="submit"
          returnKeyType="send"
          onSubmitEditing={() => void send()}
          editable={!busy}
          className="flex-1 py-2"
          style={{ color: ink, fontSize: 19, maxHeight: 96, fontFamily: fonts.displayItalic }}
        />
        {date && !attached ? (
          <IconButton icon="close" label={dayLabel(date)} onPress={onDateClear} tone="ink-muted" />
        ) : null}
        <IconButton
          icon={ready ? 'send' : 'looks'}
          label={lookbook.prompt.send}
          onPress={() => void send()}
          disabled={busy}
          tone={ready ? 'ink' : 'ink-muted'}
        />
      </View>
      {busy || waiting ? (
        <Text size="small" tone="muted">
          {waiting ? copy.plus.filing : lookbook.prompt.busyRead}
        </Text>
      ) : null}
      {error ? <ErrorText size="caption">{error}</ErrorText> : null}
      <Sheet open={menu} onClose={() => setMenu(false)} title={copy.plus.label}>
        {(
          [
            ['camera', copy.plus.camera, copy.plus.cameraHint, 'camera'],
            ['library', copy.plus.upload, null, 'image'],
            ['wardrobe', copy.plus.wardrobe, null, 'wardrobe'],
          ] as const
        ).map(([k, label, hint, icon]) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => {
              if (k === 'wardrobe') {
                setMenu(false);
                if (!hasPieces) setError(copy.plus.emptyWardrobe);
                else setPicking(true);
                return;
              }
              void addPhoto(k);
            }}
            className="min-h-11 flex-row items-center gap-3 py-3"
          >
            <Icon name={icon} size={20} color={muted} />
            <View className="flex-1">
              <Text>{label}</Text>
              {hint ? (
                <Text size="caption" tone="muted">
                  {hint}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </Sheet>
      <SwapSheet
        open={picking}
        swapping={null}
        onRack={[]}
        onClose={() => setPicking(false)}
        onPick={(p) => {
          reset();
          setPhoto(false);
          setPiece(p);
          setMode(null);
        }}
      />
    </View>
  );
});
