import { ApiClientError } from '@robes/api-client';
import { useApi, useApiClient } from '@robes/api-client/react';
import type { CreateLookInput, Piece } from '@robes/contracts';
import { lookbook as copy, errors, photoPieces } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import {
  Button,
  Eyebrow,
  fonts,
  Image,
  Skeleton,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { usePieces } from '@/features/wardrobe/pieces';
import { useInvalidateLooks } from './look-states';
import { SwapSheet } from './SwapSheet';

const draftsFull = (err: unknown): boolean =>
  err instanceof ApiClientError &&
  err.code === 'conflict' &&
  (err.details as { reason?: string } | undefined)?.reason === 'drafts_full';

// A new look (legacy 4d, the guide): nothing is a row until the first piece lands; then it is a
// draft that waits in In progress. Five drafts wait at most — a sixth asks to let the oldest go.
export function Composer({ pieceId }: { pieceId?: string }) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const refresh = useInvalidateLooks();
  const { pieces } = usePieces();
  const [adding, setAdding] = useState<string | null | false>(false);
  const model = useApi('me.model.get');
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  const control = useColor('border-control');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async (input: CreateLookInput) => {
    setBusy(true);
    try {
      const look = await api.call('looks.create', { input });
      refresh(look);
      router.replace(`/look/${look.id}`);
    } catch (err) {
      if (!draftsFull(err)) {
        toast.show({ message: errors.internal });
        return;
      }
      const drafts = await api
        .call('looks.list', { input: { limit: 60, status: 'draft' } })
        .catch(() => null);
      const oldest = drafts?.items.at(-1)?.name ?? copy.draftTile.untitled;
      Alert.alert(copy.drafts.fullTitle, copy.drafts.fullBody(oldest), [
        { text: copy.drafts.keep, style: 'cancel' },
        {
          text: copy.drafts.letGo,
          style: 'destructive',
          onPress: () => void create({ ...input, letGoOldest: true }),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };
  const start = (piece: Piece) =>
    void create({
      status: 'draft',
      pieces: [{ pieceId: piece.id }],
      ...(name.trim() ? { name: name.trim() } : {}),
    });

  // "Start a look with it" from a piece: the draft opens with that piece on the rack.
  const started = useRef(false);
  useEffect(() => {
    const piece = pieceId ? pieces.find((p) => p.id === pieceId) : undefined;
    if (piece && !started.current) {
      started.current = true;
      void create({ status: 'draft', pieces: [{ pieceId: piece.id }], anchorPieceId: piece.id });
    }
  });

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-6 px-6 pb-32">
        <View className="items-center gap-2">
          <Eyebrow>{copy.eyebrow.draft}</Eyebrow>
          {/* The title is the name: tap the italic line and write over it. */}
          <TextInput
            accessibilityLabel={copy.name.label}
            placeholder={copy.figure.untitled}
            placeholderTextColor={faint}
            value={name}
            onChangeText={setName}
            maxLength={120}
            className="min-h-11 w-full text-center text-3xl"
            style={{ color: ink, fontFamily: fonts.displayItalic }}
          />
        </View>
        <View>
          <View>
            {model.data?.cell.imageUrl ? (
              <Image source={model.data.cell.imageUrl} alt={copy.figure.alt} />
            ) : model.isPending ? (
              <Skeleton width="100%" aspectRatio={4 / 5} />
            ) : (
              <View className="aspect-[4/5] w-full items-center justify-center rounded-soft bg-surface">
                <Icon name="user" size={160} color={control} />
              </View>
            )}
            {(
              [
                ['top', 'Tops', '31%'],
                ['bottom', 'Bottoms', '58%'],
                ['shoes', 'Shoes', '86%'],
              ] as const
            ).map(([slot, category, top]) => (
              <View key={slot} className="absolute inset-x-0 items-center" style={{ top }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.figure.slots[slot]}
                  disabled={busy}
                  onPress={() => setAdding(category)}
                  className="min-h-11 -translate-y-1/2 justify-center rounded-pill border border-border-control bg-bg px-4"
                >
                  <Text
                    size="caption"
                    weight="medium"
                    className="uppercase"
                    style={{ letterSpacing: 1.6 }}
                  >
                    {copy.figure.slots[slot]}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Text size="small" tone="muted" italic className="pt-3 text-center">
            {copy.guide.body}
          </Text>
        </View>
      </ScrollView>
      {/* The actions float above the tab bar (legacy start bar). */}
      <View className="absolute inset-x-4 bottom-6 flex-row gap-2 rounded-pill border border-hairline bg-bg p-1.5">
        <Button icon="camera" className="flex-1" onPress={() => router.push('/looks/photo')}>
          {photoPieces.look.start.title}
        </Button>
        <Button variant="secondary" onPress={() => setAdding(null)} loading={busy}>
          {copy.rack.addPiece}
        </Button>
      </View>
      <SwapSheet
        open={adding !== false}
        swapping={null}
        opensOn={adding || null}
        onRack={[]}
        onClose={() => setAdding(false)}
        onPick={start}
      />
    </View>
  );
}
