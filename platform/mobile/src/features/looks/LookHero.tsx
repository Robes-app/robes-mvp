import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { errors, lookbook, looks as looksCopy } from '@robes/copy';
import { IconButton, Image, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';
import { PICKER_OPTIONS, uploadPhoto } from '@/features/wardrobe/add-pieces';
import { renditionUri } from '@/lib/images';
import { LookPicture } from './LookPicture';

const copy = looksCopy.page;

// The look's picture carries its two doors, as beta's does: the day it is worn, bottom left, and
// her own photograph of it, bottom right. The web twin is app/src/components/looks/look-hero.tsx.
export function LookHero({ look, onDiary }: { look: Look; onDiary: () => void }) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const attach = useApiMutation('looks.photo', {
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.call('looks.get', { params: { id: look.id } }), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    },
    onError: () => toast.show({ message: errors.internal }),
  });

  const pick = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const photo = picked.assets?.[0];
    if (picked.canceled || !photo) return;
    setBusy(true);
    try {
      const assetId = await uploadPhoto(api, photo, 'look_photo');
      attach.mutate({ params: { id: look.id }, input: { assetId } });
    } catch {
      toast.show({ message: errors.internal });
    } finally {
      setBusy(false);
    }
  };

  const render = renditionUri(look.image, 360);
  return (
    <View className="relative">
      {look.frame ? (
        <LookPicture look={look} />
      ) : render ? (
        <Image source={render} alt={copy.imageAlt(look.name)} blurhash={look.image?.blurhash} />
      ) : null}
      <View className="absolute bottom-3 left-3 rounded-pill bg-bg">
        <IconButton icon="plan" label={lookbook.card.diary} onPress={onDiary} />
      </View>
      <View className="absolute right-3 bottom-3 rounded-pill bg-bg">
        <IconButton
          icon="camera"
          label={copy.addPhoto}
          disabled={busy || attach.isPending}
          onPress={() => void pick()}
        />
      </View>
    </View>
  );
}
