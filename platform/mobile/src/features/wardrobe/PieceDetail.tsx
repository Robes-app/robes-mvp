import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { wardrobe as copy, lookbook, ui } from '@robes/copy';
import {
  Button,
  EmptyState,
  ErrorText,
  Eyebrow,
  Field,
  Heading,
  Image,
  PrimaryScope,
  Skeleton,
  Text,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SuggestedRail } from '@/features/looks/SuggestedRail';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { READING_REFRESH_MS, useDeletePiece } from './pieces';

type Draft = { label: string; color: string; brand: string; size: string; notes: string };

const toDraft = (p: Piece): Draft => ({
  label: p.label,
  color: p.color ?? '',
  brand: p.brand ?? '',
  size: p.size ?? '',
  notes: p.notes ?? '',
});
const orNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View className="gap-1 border-b border-hairline py-3">
      <Text size="caption" tone="muted">
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  );
}

function EditForm({ piece, onDone }: { piece: Piece; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => toDraft(piece));
  const update = useApiMutation('wardrobe.update', {
    onSuccess: async (saved) => {
      queryClient.setQueryData(queryKeys.call('wardrobe.get', { params: { id: saved.id } }), saved);
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
      onDone();
    },
  });
  const set = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  return (
    <PrimaryScope>
      <View className="gap-4">
        <Field
          label={copy.piece.label}
          value={draft.label}
          onChangeText={set('label')}
          maxLength={120}
        />
        <Field
          label={copy.piece.color}
          value={draft.color}
          onChangeText={set('color')}
          maxLength={60}
        />
        <Field
          label={copy.piece.brand}
          value={draft.brand}
          onChangeText={set('brand')}
          maxLength={80}
        />
        <Field
          label={copy.piece.size}
          value={draft.size}
          onChangeText={set('size')}
          maxLength={40}
        />
        <Field
          label={copy.piece.notes}
          value={draft.notes}
          onChangeText={set('notes')}
          maxLength={1000}
          multiline
          error={update.isError ? errorMessage(update.error) : null}
        />
        <Button
          onPress={() =>
            update.mutate({
              params: { id: piece.id },
              input: {
                label: draft.label.trim() || piece.label,
                color: orNull(draft.color),
                brand: orNull(draft.brand),
                size: orNull(draft.size),
                notes: orNull(draft.notes),
              },
            })
          }
          disabled={draft.label.trim() === ''}
          loading={update.isPending}
          loadingLabel={copy.piece.saving}
        >
          {copy.piece.save}
        </Button>
        <Button variant="quiet" onPress={onDone} className="self-center">
          {ui.close}
        </Button>
      </View>
    </PrimaryScope>
  );
}

export function PieceDetail({ id, saw = false }: { id: string; saw?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const {
    data: piece,
    isPending,
    isError,
    error,
  } = useApi(
    'wardrobe.get',
    { params: { id } },
    { refetchInterval: (q) => (q.state.data?.status === 'reading' ? READING_REFRESH_MS : false) },
  );
  const remove = useDeletePiece();

  if (isPending) {
    return (
      <View className="gap-4 px-6">
        <Skeleton width="100%" aspectRatio={4 / 5} />
        <Skeleton shape="text" width="60%" height={28} />
      </View>
    );
  }
  if (isError || !piece) return <EmptyState title={errorMessage(error)} />;

  const uri = renditionUri(piece.image, 400);
  const reading = piece.status === 'reading';
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView contentContainerClassName="gap-4 px-6 pb-10">
        {uri ? (
          <Image source={uri} alt={copy.photoAlt(piece.label)} blurhash={piece.image?.blurhash} />
        ) : null}
        {/* Until Robes has read it, "New piece" and "Other" are placeholders, not facts. */}
        {piece.status === 'ready' ? (
          <Heading size="md">{piece.label}</Heading>
        ) : (
          <Text tone="faint" italic accessibilityRole="header">
            {reading ? copy.newPiece : piece.label}
          </Text>
        )}
        {reading ? <Text tone="muted">{copy.reading}</Text> : null}
        {piece.status === 'failed' ? <ErrorText>{copy.noPieceFound}</ErrorText> : null}
        {saw && piece.status !== 'failed' ? <Saw piece={piece} /> : null}
        {editing ? (
          <EditForm piece={piece} onDone={() => setEditing(false)} />
        ) : (
          <PrimaryScope>
            <View>
              {piece.status === 'ready' ? (
                <Detail
                  label={copy.category}
                  value={[piece.category, piece.categoryL2].filter(Boolean).join(' · ')}
                />
              ) : null}
              <Detail label={copy.piece.color} value={piece.color} />
              <Detail label={copy.piece.brand} value={piece.brand} />
              <Detail label={copy.piece.size} value={piece.size} />
              <Detail label={copy.piece.notes} value={piece.notes} />
            </View>
            <SuggestedRail pieceId={piece.id} />
            <View className="gap-3 pt-2">
              <Button
                icon="looks"
                disabled={reading}
                onPress={() =>
                  router.push({ pathname: '/looks/style', params: { pieceId: piece.id } })
                }
              >
                {copy.piece.stylePiece}
              </Button>
              <Button
                variant="secondary"
                disabled={reading}
                onPress={() =>
                  router.push({ pathname: '/looks/new', params: { pieceId: piece.id } })
                }
              >
                {lookbook.startLook}
              </Button>
              <Button variant="secondary" onPress={() => setEditing(true)}>
                {copy.edit}
              </Button>
              <Button
                variant="quiet"
                icon="trash"
                className="self-center"
                onPress={() => {
                  remove.mutate({ params: { id: piece.id } });
                  router.back();
                }}
              >
                {copy.piece.remove}
              </Button>
            </View>
          </PrimaryScope>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Beta's reveal: what Robes filed, row by row, once it has read the piece.
function Saw({ piece }: { piece: Piece }) {
  const router = useRouter();
  const rows: [string, string | null][] = [
    [copy.saw.rows.piece, piece.label],
    [copy.saw.rows.category, [piece.category, piece.categoryL2].filter(Boolean).join(' · ')],
    [copy.saw.rows.colour, piece.color],
    [copy.saw.rows.brand, piece.brand],
  ];
  return (
    <View className="gap-3">
      <Heading size="md">{copy.saw.title}</Heading>
      {piece.status === 'ready' ? (
        <>
          <View className="border-hairline border-t">
            {rows.map(([k, v]) => (
              <View key={k} className="flex-row items-baseline gap-3 border-hairline border-b py-2">
                <Eyebrow className="flex-1">{k}</Eyebrow>
                <Text size="small" tone={v ? 'ink' : 'faint'} italic={!v}>
                  {v || copy.saw.unread}
                </Text>
              </View>
            ))}
          </View>
          <Button variant="secondary" onPress={() => router.replace('/wardrobe')}>
            {copy.saw.keep}
          </Button>
        </>
      ) : (
        <Text size="small" tone="muted" italic accessibilityLiveRegion="polite">
          {copy.saw.reading}
        </Text>
      )}
    </View>
  );
}
