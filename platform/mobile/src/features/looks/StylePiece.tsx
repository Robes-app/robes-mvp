import { useApiMutation } from '@robes/api-client/react';
import type { GenerateLookInput, Piece } from '@robes/contracts';
import { looks as copy } from '@robes/copy';
import {
  Button,
  Eyebrow,
  Field,
  Heading,
  Image,
  MIN_TOUCH,
  PrimaryScope,
  Text,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { usePieces } from '@/features/wardrobe/pieces';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';

function PieceChoice({
  piece,
  selected,
  onPress,
}: {
  piece: Piece;
  selected: boolean;
  onPress: () => void;
}) {
  const uri = renditionUri(piece.image, 96);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={piece.label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{ width: 96, minHeight: MIN_TOUCH }}
      className={
        selected
          ? 'gap-1 rounded-soft border border-ink p-1'
          : 'gap-1 rounded-soft border border-hairline p-1'
      }
    >
      {uri ? <Image source={uri} alt="" blurhash={piece.image?.blurhash} /> : null}
      <Text size="caption" numberOfLines={2}>
        {piece.label}
      </Text>
    </Pressable>
  );
}

// Style a piece: one of hers, or described in words, plus an optional occasion.
export function StylePiece({ initialPieceId }: { initialPieceId?: string }) {
  const router = useRouter();
  const { pieces } = usePieces();
  const ready = pieces.filter((p) => p.status === 'ready');
  const [pieceId, setPieceId] = useState<string | null>(initialPieceId ?? null);
  const [text, setText] = useState('');
  const [occasion, setOccasion] = useState('');
  const start = useApiMutation('looks.generate', {
    onSuccess: ({ jobId }) => router.replace(`/looks/job/${jobId}`),
  });

  const anchor: GenerateLookInput['anchor'] | null = pieceId
    ? { type: 'piece', pieceId }
    : text.trim().length >= 2
      ? { type: 'text', text: text.trim() }
      : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView contentContainerClassName="gap-6 px-6 pb-10" keyboardShouldPersistTaps="handled">
        <View className="gap-2">
          <Eyebrow>{copy.stylePiece.eyebrow}</Eyebrow>
          <Heading>{copy.stylePiece.title}</Heading>
        </View>
        {ready.length > 0 ? (
          <View className="gap-2">
            <Text tone="muted">{copy.stylePiece.fromWardrobe}</Text>
            <FlatList
              horizontal
              data={ready}
              keyExtractor={(p) => p.id}
              accessibilityRole="radiogroup"
              contentContainerClassName="gap-2"
              renderItem={({ item }) => (
                <PieceChoice
                  piece={item}
                  selected={item.id === pieceId}
                  onPress={() => setPieceId(item.id === pieceId ? null : item.id)}
                />
              )}
            />
          </View>
        ) : null}
        <Field
          label={copy.stylePiece.describe}
          placeholder={copy.stylePiece.describePlaceholder}
          maxLength={300}
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (value.trim()) setPieceId(null);
          }}
        />
        <Field
          label={copy.stylePiece.occasionLabel}
          placeholder={copy.stylePiece.occasionPlaceholder}
          maxLength={120}
          value={occasion}
          onChangeText={setOccasion}
          error={start.isError ? errorMessage(start.error) : null}
        />
        <PrimaryScope>
          <Button
            onPress={() =>
              anchor &&
              start.mutate({
                input: { anchor, ...(occasion.trim() ? { occasion: occasion.trim() } : {}) },
              })
            }
            disabled={!anchor}
            loading={start.isPending}
            loadingLabel={copy.stylePiece.starting}
          >
            {copy.stylePiece.start}
          </Button>
        </PrimaryScope>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
