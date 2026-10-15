import { queryKeys, useApiMutation } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { looks as copy, errors, photoPieces, ui } from '@robes/copy';
import {
  Button,
  CardSkeleton,
  EmptyState,
  Eyebrow,
  Field,
  Heading,
  Image,
  PrimaryScope,
  Text,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { usePieces } from '@/features/wardrobe/pieces';
import { renditionUri } from '@/lib/images';

function Choice({
  piece,
  selected,
  onToggle,
}: {
  piece: Piece;
  selected: boolean;
  onToggle: () => void;
}) {
  const uri = renditionUri(piece.image, 100);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={piece.label}
      accessibilityState={{ checked: selected }}
      onPress={onToggle}
      style={{ width: '30%' }}
      className={`gap-1 rounded-soft p-1 ${selected ? 'border-2 border-ink' : 'border-2 border-transparent'}`}
    >
      {uri ? <Image source={uri} alt="" blurhash={piece.image?.blurhash} /> : null}
      <Text size="caption" numberOfLines={2}>
        {piece.label}
      </Text>
    </Pressable>
  );
}

// Create › New look: choose pieces in order, optionally name it; Robes suggests a name otherwise.
export function Composer() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { pieces, isPending } = usePieces();
  const [chosen, setChosen] = useState<string[]>([]);
  const [name, setName] = useState('');
  const create = useApiMutation('looks.create', {
    onSuccess: async (look) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
      router.replace(`/look/${look.id}`);
    },
    onError: () => toast.show({ message: errors.internal }),
  });
  const ready = pieces.filter((p) => p.status === 'ready');
  const toggle = (id: string) =>
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  if (isPending) {
    return (
      <View className="flex-row gap-3 px-6">
        <CardSkeleton className="flex-1" />
        <CardSkeleton className="flex-1" />
      </View>
    );
  }
  if (ready.length === 0) return <EmptyState title={copy.composer.empty} />;
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      <Heading>{copy.composer.eyebrow}</Heading>
      {/* A look from a photo (legacy use case 2b): the second start beside the rack. */}
      <Button variant="secondary" icon="camera" onPress={() => router.push('/looks/photo')}>
        {photoPieces.look.start.title}
      </Button>
      <View className="gap-3">
        <Eyebrow>{copy.composer.pick}</Eyebrow>
        <View className="flex-row flex-wrap gap-3">
          {ready.map((piece) => (
            <Choice
              key={piece.id}
              piece={piece}
              selected={chosen.includes(piece.id)}
              onToggle={() => toggle(piece.id)}
            />
          ))}
        </View>
      </View>
      <Field
        label={copy.composer.nameLabel}
        placeholder={copy.composer.namePlaceholder}
        value={name}
        onChangeText={setName}
        maxLength={120}
      />
      <PrimaryScope>
        <Button
          disabled={chosen.length === 0}
          loading={create.isPending}
          loadingLabel={ui.loading}
          onPress={() =>
            create.mutate({
              input: {
                pieces: chosen.map((pieceId) => ({ pieceId })),
                ...(name.trim() ? { name: name.trim() } : {}),
              },
            })
          }
        >
          {copy.composer.create}
        </Button>
      </PrimaryScope>
    </ScrollView>
  );
}
