import { ApiClientError } from '@robes/api-client';
import { useApiClient } from '@robes/api-client/react';
import type { CreateLookInput, Piece } from '@robes/contracts';
import { lookbook as copy, errors } from '@robes/copy';
import { Button, Eyebrow, Field, Text, useToast } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
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
  const [adding, setAdding] = useState(false);
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
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      <View className="items-center gap-2">
        <Eyebrow>{copy.eyebrow.draft}</Eyebrow>
        <Field
          label={copy.name.label}
          placeholder={copy.name.placeholder}
          value={name}
          onChangeText={setName}
          maxLength={120}
        />
      </View>
      <View className="gap-1 rounded-soft border border-dashed border-border-control p-4">
        <Text>{copy.guide.title}</Text>
        <Text size="small" tone="muted">
          {copy.guide.body}
        </Text>
        <Text size="small" tone="faint">
          {copy.guide.hint}
        </Text>
      </View>
      <Text size="small" tone="muted">
        {copy.guide.after}
      </Text>
      <Button variant="secondary" onPress={() => setAdding(true)} loading={busy}>
        {copy.rack.addPiece}
      </Button>
      <SwapSheet
        open={adding}
        swapping={null}
        onRack={[]}
        onClose={() => setAdding(false)}
        onPick={start}
      />
    </ScrollView>
  );
}
