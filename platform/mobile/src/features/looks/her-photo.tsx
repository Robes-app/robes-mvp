import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { errors, looks as looksCopy, wardrobe } from '@robes/copy';
import { Sheet, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';
import { PICKER_OPTIONS, uploadPhoto } from '@/features/wardrobe/add-pieces';
import { SettingsRow } from '@/features/you/Settings';

const copy = looksCopy.page;

// Her photograph of a look — one door wherever the look stands: the saved look's picture, the
// composer's canvas (a draft) and the card on a day (beta's camera on each). It lands on the LOOK
// (`looks.photo`), so every surface shows it; You · Model then picks which picture is the record.
// Web twin: app/src/components/looks/her-photo.tsx.
export function useHerPhoto(look: Look, onLanded?: (updated: Look) => void) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  const [choosing, setChoosing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const onError = () => toast.show({ message: errors.internal });
  const landed = (updated: Look) => {
    queryClient.setQueryData(key, updated);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
  };
  const attach = useApiMutation('looks.photo', {
    onSuccess: (updated) => {
      landed(updated);
      onLanded?.(updated);
    },
    onError,
  });
  const update = useApiMutation('looks.update', {
    onSuccess: landed,
    onError: () => {
      onError();
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const take = async (from: 'camera' | 'library') => {
    setChoosing(false);
    if (from === 'camera') {
      const allowed = await ImagePicker.requestCameraPermissionsAsync();
      if (!allowed.granted) return;
    }
    const picked =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const photo = picked.assets?.[0];
    if (picked.canceled || !photo) return;
    setUploading(true);
    try {
      const assetId = await uploadPhoto(api, photo, 'look_photo');
      attach.mutate({ params: { id: look.id }, input: { assetId } });
    } catch {
      onError();
    } finally {
      setUploading(false);
    }
  };

  const hasPhoto = look.photo !== null;
  const label = hasPhoto ? copy.replacePhoto : copy.addPhoto;
  return {
    hasPhoto,
    label,
    busy: uploading || attach.isPending,
    pick: () => setChoosing(true),
    // You · Model: the tap is the choice — the picture swaps at once, then the record is saved.
    choose: (record: 'photo' | 'model') => {
      if (record === look.record) return;
      queryClient.setQueryData(key, {
        ...look,
        record,
        image: record === 'photo' ? look.photo : (look.model ?? look.photo),
      });
      update.mutate({ params: { id: look.id }, input: { record } });
    },
    // Take one or choose one: the sheet the door opens.
    sheet: (
      <Sheet open={choosing} onClose={() => setChoosing(false)} title={label} closeButton>
        <View className="overflow-hidden rounded-soft border border-hairline bg-surface-raised">
          <SettingsRow
            first
            label={wardrobe.add.doors.photograph}
            onPress={() => void take('camera')}
          />
          <SettingsRow label={wardrobe.add.doors.cameraRoll} onPress={() => void take('library')} />
        </View>
      </Sheet>
    ),
  };
}
