import { useApi } from '@robes/api-client/react';
import { looks as copy } from '@robes/copy';
import {
  Button,
  EmptyState,
  Eyebrow,
  Heading,
  Image,
  PrimaryScope,
  Skeleton,
  Text,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { localDate, useRemoveLook, useWearToday } from './saved-looks';

export function LookDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: look, isPending, isError, error } = useApi('looks.get', { params: { id } });
  const wear = useWearToday();
  const remove = useRemoveLook();
  if (isPending) return <Skeleton width="100%" aspectRatio={4 / 5} />;
  if (isError || !look) return <EmptyState title={errorMessage(error)} />;
  const woreToday = look.lastWornOn === localDate();
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      <View className="gap-2">
        <Heading>{look.name}</Heading>
        <Text tone="muted">{copy.look.worn(look.timesWorn)}</Text>
      </View>
      <View className="gap-3">
        <Eyebrow>{copy.look.pieces}</Eyebrow>
        <View className="flex-row flex-wrap gap-3">
          {look.pieces.map(({ piece }) => {
            const uri = renditionUri(piece.image, 100);
            return (
              <View key={piece.id} className="gap-1" style={{ width: '30%' }}>
                {uri ? <Image source={uri} alt="" blurhash={piece.image?.blurhash} /> : null}
                <Text size="caption" numberOfLines={2}>
                  {piece.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <PrimaryScope>
        <View className="gap-3">
          <Button
            onPress={() => wear.mutate({ params: { id: look.id }, input: { wornOn: localDate() } })}
            disabled={woreToday}
            loading={wear.isPending}
          >
            {woreToday ? copy.look.woreToday : copy.look.wearToday}
          </Button>
          <Button
            variant="quiet"
            icon="trash"
            className="self-center"
            onPress={() => {
              remove.mutate({ params: { id: look.id } });
              router.back();
            }}
          >
            {copy.result.remove}
          </Button>
        </View>
      </PrimaryScope>
    </ScrollView>
  );
}
