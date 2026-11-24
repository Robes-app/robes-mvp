import { useApiClient } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import {
  anchorName,
  type Source,
  type Sources,
  sourceBalance,
  toggleSource,
} from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { fonts, Image, Text, useColor, useToast } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDockYield } from '@/features/looks/dock-yield';
import { PromptDock, StylingCard } from '@/features/looks/StylingCard';
import { nativeAnalytics } from '@/lib/analytics';
import { errorMessage } from '@/lib/errors';
import { pieceSource } from '@/lib/images';
import { handPieceStart } from '@/lib/piece-start';

const copy = wardrobe.piece;
// Both sources on: a piece she owns is styled from her wardrobe and the shop alike (handoff §4.2).
const BOTH: Sources = { wardrobe: true, shop: true };
const CHIP_CLOSE = 30;

// Style a piece → draft look (handoff 24 Nov, design 3b): the sparkle on her piece's page opens the
// draft look's own bar (iOS's own sheet), the piece as a chip over the sources and her words, over
// a scrim that closes it. A send — her words, or none, when the piece is the request — starts one
// draft styled around the piece, its anchor, and opens the draft look following it once the bar
// has gone (iOS presents nothing over a sheet still up). × on the chip, the scrim or a swipe down
// closes the bar, and nothing is made. `hidden`: another sheet of the page is open.
// Web twin: app/src/components/wardrobe/piece-style.tsx.
export function PieceStyle({ piece, hidden }: { piece: Piece; hidden: boolean }) {
  const api = useApiClient();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<'spark' | 'bar' | 'thread'>('spark');
  const [prompt, setPrompt] = useState('');
  const [sources, setSources] = useState<Sources>(BOTH);
  const [busy, setBusy] = useState(false);
  const dockYield = useDockYield(hidden, () => setState('spark'));
  const close = () => {
    if (!busy) setState('spark');
  };
  const send = async () => {
    if (busy) return;
    const words = prompt.trim() || copy.style.prompt(anchorName(piece.label, piece.brand));
    setBusy(true);
    const tracked = (ok: boolean) =>
      nativeAnalytics.track('prompt_submitted', {
        surface: 'piece',
        intent: 'piece',
        scope: 'none',
        ok,
      });
    try {
      const { jobId } = await api.call('looks.prompt', {
        input: {
          prompt: words,
          draft: true,
          anchorPieceId: piece.id,
          balance: sourceBalance(sources),
        },
      });
      tracked(true);
      handPieceStart({ jobId, words, sources });
      setPrompt('');
      dockYield.putAwayThen(() => {
        setState('spark');
        router.push({
          pathname: '/looks/draft/[id]',
          params: { id: 'new', job: jobId, from: piece.id },
        });
      });
    } catch (err) {
      tracked(false);
      toast.show({ message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  if (hidden && state === 'spark') return null;
  const card = {
    lead: <PieceChip piece={piece} onClose={close} />,
    sources,
    onSource: (which: Source) => setSources(toggleSource(sources, which, 1)),
    wardrobeEmpty: false,
    placeholder: copy.style.placeholder,
    value: prompt,
    onChange: setPrompt,
    onSend: () => void send(),
    emptySend: 'send' as const,
    busy,
  };
  return (
    <>
      {state !== 'spark' ? (
        // The scrim: the page stays put behind the bar, and a tap on it closes the bar.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.style.close}
          onPress={close}
          testID="prompt-scrim"
          className="absolute inset-0 bg-backdrop"
        />
      ) : null}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 bottom-0"
        style={{ paddingBottom: insets.bottom + 8, paddingRight: 6 }}
      >
        <PromptDock
          state={state}
          first
          bare
          line={null}
          working={busy}
          dot={false}
          sparkLabel={copy.stylePiece}
          onRestore={() => {
            nativeAnalytics.track('piece_style_opened');
            setState('bar');
          }}
          onExpand={() => setState('thread')}
          onCollapse={() => setState('bar')}
          onMinimise={close}
          covered={dockYield.covered}
          onSheetUp={dockYield.onSheetUp}
          box={<StylingCard {...card} onOpen={() => setState('thread')} />}
        >
          <StylingCard {...card} card autoFocus />
        </PromptDock>
      </View>
    </>
  );
}

// The piece the box is about (handoff §4.2): its picture, its name in the serif, "{Category} ·
// {Brand}", and × to close the box. Web twin: PieceChip in components/wardrobe/piece-style.tsx.
function PieceChip({ piece, onClose }: { piece: Piece; onClose: () => void }) {
  const muted = useColor('ink-muted');
  const { uri, fit } = pieceSource(piece.image, 40);
  return (
    <View
      testID="piece-chip"
      className="flex-row items-center gap-3 bg-surface"
      style={{ borderRadius: 14, padding: 6 }}
    >
      <View className="overflow-hidden" style={{ width: 40, borderRadius: 7 }}>
        {uri ? (
          <Image source={uri} alt="" {...fit} />
        ) : (
          <View className="bg-surface-sunk" style={{ aspectRatio: 4 / 5 }} />
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: 16 }}>
          {piece.label}
        </Text>
        <Text
          numberOfLines={1}
          className="text-ink-muted"
          style={{ fontFamily: fonts.sans, fontSize: 11.5 }}
        >
          {copy.style.sub(piece.category, piece.brand)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.style.close}
        onPress={onClose}
        hitSlop={8}
        testID="piece-chip-close"
        className="items-center justify-center rounded-pill border-rule-mid bg-surface-raised"
        style={{ width: CHIP_CLOSE, height: CHIP_CLOSE, borderWidth: 1, marginRight: 6 }}
      >
        <Icon name="close" size={14} color={muted} />
      </Pressable>
    </View>
  );
}
