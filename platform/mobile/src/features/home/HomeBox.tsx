import { useApi, useApiClient } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { home as copy, lookbook } from '@robes/copy';
import { isTripAsk } from '@robes/core/home';
import { ASK_MAX_CHARS, askDateFrom, defaultBalance, pieceNoun } from '@robes/core/looks';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import {
  ErrorText,
  fonts,
  IconButton,
  Image,
  MIN_TOUCH,
  Sheet,
  Text,
  useColor,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, TextInput, type TextInputInstance, View } from 'react-native';
import { SwapSheet } from '@/features/looks/SwapSheet';
import { localDate } from '@/features/looks/saved-looks';
import { dayLabel } from '@/features/plan/plan';
import { nativeAnalytics } from '@/lib/analytics';
import { errorMessage } from '@/lib/errors';
import { useFeatures } from '@/lib/features';
import { renditionUri } from '@/lib/images';
import { type PhotoSource, pickOne, usePhotoFiling } from './file-photo';

type MenuKey = 'camera' | 'library' | 'wardrobe';
export type HomeBoxHandle = { focus: () => void };

const MENU: readonly (readonly [MenuKey, string, string, IconName])[] = [
  ['camera', copy.plus.camera, copy.plus.cameraHint, 'camera'],
  ['library', copy.plus.upload, copy.plus.uploadHint, 'image'],
  ['wardrobe', copy.plus.wardrobe, copy.plus.wardrobeHint, 'wardrobe'],
];

// The new-look box (legacy _rbLookPrompt, mode new — HomePrompt 2026-10-15): her words become
// three suggested looks on the deck for the day they name. A piece by photograph or from the
// wardrobe sits INSIDE the box above her words and is the ask on its own: Send is three looks
// around it. Where the pieces come from follows the Shop toggle's rest (plan 2026-11-09 R1): her
// wardrobe alone once she has one, a mix before. The web twin is app/src/components/home/home-box.tsx.
export const HomeBox = forwardRef<
  HomeBoxHandle,
  {
    placeholder?: string;
    date?: string | null;
    onDateClear?: () => void;
    hasPieces: boolean;
    autoFocus?: boolean;
    // Home's own box: the deck's back lands home.
    fromHome?: boolean;
  }
>(function HomeBox(
  {
    placeholder = lookbook.prompt.doorNew,
    date = null,
    onDateClear,
    hasPieces,
    autoFocus,
    fromHome = true,
  },
  ref,
) {
  const router = useRouter();
  const api = useApiClient();
  const { features } = useFeatures();
  const input = useRef<TextInputInstance>(null);
  const ink = useColor('ink');
  const bg = useColor('bg');
  const faint = useColor('ink-faint');
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [picking, setPicking] = useState(false);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [photo, setPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const surface = fromHome ? 'home' : 'create';
  const { filing, file, reset } = usePhotoFiling();
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));

  const attached = piece !== null || photo;
  const filedPiece = filing.phase === 'filed' ? filing.piece : null;
  const stillFiling = filing.phase === 'uploading' || filing.phase === 'reading';
  const forSend = piece ?? filedPiece;
  const place = forSend
    ? copy.plus.styleFor(pieceNoun(forSend.label))
    : attached
      ? copy.plus.placeholder
      : date
        ? copy.doorDay(dayLabel(date))
        : placeholder;

  const clear = () => {
    setPiece(null);
    setPhoto(false);
    reset();
  };
  // The Shop toggle's rest (PRD rev 3 §4.6): the box has no toggle, so the look is built from her
  // wardrobe once she has one, and reaches for new pieces only while it is empty.
  const balance = defaultBalance(hasPieces || forSend ? 1 : 0);
  const toDeck = (jobId: string) =>
    router.push(
      fromHome
        ? { pathname: '/looks/job/[jobId]', params: { jobId, from: 'home' } }
        : { pathname: '/looks/job/[jobId]', params: { jobId } },
    );
  const failed = (err: unknown) => {
    nativeAnalytics.track('prompt_submitted', {
      surface,
      intent: attached ? 'piece' : 'words',
      scope: date ? 'day' : 'none',
      ok: false,
    });
    setError(errorMessage(err));
  };

  async function send(): Promise<void> {
    if (busy) return;
    const words = text.trim();
    setError(null);
    if (attached) {
      if (stillFiling) {
        setWaiting(true);
        return;
      }
      if (!forSend) {
        setError(copy.plus.notFiled);
        return;
      }
      setBusy(true);
      try {
        const { jobId } = await api.call('looks.generate', {
          input: {
            anchor: { type: 'piece', pieceId: forSend.id },
            ...(words ? { occasion: words.slice(0, 120) } : {}),
            balance,
          },
        });
        nativeAnalytics.track('prompt_submitted', {
          surface,
          intent: 'piece',
          scope: 'none',
          ok: true,
        });
        setText('');
        setPiece(null);
        setPhoto(false);
        reset();
        toDeck(jobId);
      } catch (err) {
        failed(err);
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
    setBusy(true);
    try {
      const { jobId } = await api.call('looks.prompt', {
        input: { prompt: words, ...(day ? { date: day } : {}), balance },
      });
      nativeAnalytics.track('prompt_submitted', {
        surface,
        intent: 'words',
        scope: day ? 'day' : 'none',
        ok: true,
      });
      setText('');
      onDateClear?.();
      toDeck(jobId);
    } catch (err) {
      failed(err);
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
    void file(picked);
  };
  const choose = (k: MenuKey) => {
    if (k === 'wardrobe') {
      setMenu(false);
      if (!hasPieces) setError(copy.plus.emptyWardrobe);
      else setPicking(true);
      return;
    }
    void addPhoto(k);
  };

  // While a photograph is read the card says so; once filed it names the piece.
  const reading = photo && !filedPiece && filing.phase !== 'none';
  const name =
    piece?.label ?? filedPiece?.label ?? (reading ? copy.plus.reading : copy.plus.newPiece);
  const sub = piece
    ? copy.plus.inWardrobe(piece.categoryL2 ?? piece.category)
    : filing.phase === 'filed'
      ? copy.plus.filedTo(filing.piece.categoryL2 ?? filing.piece.category)
      : filing.phase === 'none'
        ? copy.plus.nothingFound
        : filing.phase === 'failed'
          ? copy.plus.notFiled
          : copy.plus.readingSub;
  const thumb = piece
    ? renditionUri(piece.image, 48)
    : filing.phase !== 'idle'
      ? filing.preview
      : null;
  // A piece is the ask on its own: the arrow is ready the moment it lands.
  const ready = attached || text.trim().length >= 2;
  // The box opens to 24pt corners on the warm edge once it holds a piece.
  const open = attached;

  const plus = (
    <IconButton icon="plus" label={copy.plus.label} onPress={() => setMenu(true)} framed />
  );
  const sendButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={lookbook.prompt.send}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={() => void send()}
      style={{ width: MIN_TOUCH, height: MIN_TOUCH }}
      className={`items-center justify-center rounded-pill ${ready ? 'bg-ink' : ''}`}
    >
      <Icon name={ready ? 'send' : 'looks'} size={20} color={ready ? bg : faint} />
    </Pressable>
  );
  const field = (
    <TextInput
      ref={input}
      accessibilityLabel={place}
      placeholder={place}
      placeholderTextColor={faint}
      value={text}
      onChangeText={setText}
      maxLength={ASK_MAX_CHARS}
      multiline
      autoFocus={autoFocus}
      submitBehavior="submit"
      returnKeyType="send"
      onSubmitEditing={() => void send()}
      editable={!busy}
      className="flex-1 py-2"
      style={{ color: ink, fontSize: 19, maxHeight: 96, fontFamily: fonts.displayItalic }}
    />
  );

  return (
    <View className="gap-2" testID="home-box">
      {open ? (
        <View className="gap-3 rounded-[24px] border border-selected-line bg-surface-raised p-3">
          {attached ? (
            <View
              className="flex-row items-center gap-3 rounded-soft border border-hairline bg-bg p-2"
              testID="box-piece"
            >
              <View style={{ width: 40, opacity: reading ? 0.6 : 1 }}>
                {thumb ? <Image source={thumb} alt="" /> : null}
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="text-lg" style={{ fontFamily: fonts.display }}>
                  {name}
                </Text>
                <Text size="caption" tone="muted" numberOfLines={1}>
                  {sub}
                </Text>
              </View>
              <IconButton icon="close" label={copy.plus.remove} onPress={clear} tone="ink-muted" />
            </View>
          ) : null}
          {field}
          <View className="flex-row items-center justify-between">
            {plus}
            {sendButton}
          </View>
        </View>
      ) : (
        // Beta's prompt at rest: a one-line white pill on the fine edge, the + circle at its left.
        <View className="min-h-[54px] flex-row items-center gap-2 rounded-[27px] border border-rule-mid bg-surface-raised py-[5px] pr-1 pl-[5px]">
          {plus}
          {field}
          {date && onDateClear ? (
            <IconButton
              icon="close"
              label={dayLabel(date)}
              onPress={onDateClear}
              tone="ink-muted"
            />
          ) : null}
          {sendButton}
        </View>
      )}
      {busy || waiting ? (
        <Text size="small" tone="muted">
          {waiting ? copy.plus.filing : lookbook.prompt.busyRead}
        </Text>
      ) : null}
      {error ? <ErrorText size="caption">{error}</ErrorText> : null}
      <Sheet open={menu} onClose={() => setMenu(false)} eyebrow={copy.plus.label}>
        {MENU.map(([k, label, hint, icon]) => (
          <View key={k}>
            {k === 'wardrobe' ? <View className="my-1 border-hairline border-t" /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => choose(k)}
              className="min-h-11 flex-row items-center gap-3 py-3"
            >
              <View
                style={{ width: 34, height: 34 }}
                className="items-center justify-center rounded-pill bg-surface"
              >
                <Icon name={icon} size={16} color={ink} />
              </View>
              <View className="flex-1">
                <Text>{label}</Text>
                <Text tone="muted" style={{ fontFamily: fonts.displayItalic, fontSize: 15 }}>
                  {hint}
                </Text>
              </View>
            </Pressable>
          </View>
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
        }}
      />
    </View>
  );
});

// The same box on the doors that are not home (the empty Suggested tab, the Create screen).
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
