import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { PieceValues, UpdatePieceInput } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { type RowChanges, readDraft, rowChanges, wishChanges } from '@robes/core/add-flow';
import { Icon } from '@robes/icons/native';
import {
  Button,
  Em,
  ErrorText,
  Eyebrow,
  Heading,
  PrimaryScope,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { PICKER_OPTIONS, uploadPhoto } from '../add-pieces';
import { type PieceField, PieceFieldSheet } from '../PieceFieldSheet';
import { RecordRows } from '../PieceRows';
import type { AddDestination } from './flow';
import { Filed } from './Review';

const copy = wardrobe.add.manual;
const EMPTY = readDraft({
  label: '',
  brand: null,
  notes: null,
  categoryL2: null,
  categoryL3: null,
  color: null,
});

// Add without a photo (design "Add Piece — Handoff"): a dashed "Add a photo" invite, then the
// record's four sections as rows, each opening its drawer, and the one commit. Web twin:
// components/wardrobe/add/manual-add.tsx.
export function ManualAdd({ to }: { to: AddDestination }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const muted = useColor('ink-muted');
  const [changes, setChanges] = useState<RowChanges>({});
  const [field, setField] = useState<PieceField | null>(null);
  const [photo, setPhoto] = useState<{ uri: string; assetId: string | null } | null>(null);
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const values = { ...EMPTY, ...changes } as PieceValues;

  async function addPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.show({ message: wardrobe.photosDenied });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setPhoto({ uri: asset.uri, assetId: null });
    try {
      const assetId = await uploadPhoto(api, asset, to === 'wishlist' ? 'wishlist' : 'wardrobe');
      setPhoto({ uri: asset.uri, assetId });
    } catch {
      setPhoto(null);
      toast.show({ message: wardrobe.addFailed });
    }
  }

  async function file() {
    const label = values.label.trim();
    if (!label) {
      setNameError(true);
      setField('label');
      return;
    }
    setSaving(true);
    setFailed(false);
    const image = photo?.assetId ? { imageAssetId: photo.assetId } : {};
    try {
      if (to === 'wishlist') {
        await api.call('wishlist.create', { input: { ...wishChanges(changes), label, ...image } });
      } else {
        await api.call('wardrobe.create', { input: { ...changes, label, ...image } });
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.route(to === 'wishlist' ? 'wishlist.list' : 'wardrobe.list'),
      });
      setDone(true);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  if (done) return <Filed to={to} kept={1} />;

  const uploading = !!photo && !photo.assetId;
  return (
    <PrimaryScope>
      <ScrollView contentContainerClassName="gap-5 px-6 pb-12">
        <View className="gap-2">
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <Heading size="md" style={{ fontSize: 32 }}>
            {copy.title} <Em>{copy.wink}</Em>
          </Heading>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={photo ? copy.changePhoto : copy.addPhoto}
          onPress={() => void addPhoto()}
          disabled={uploading}
          className="h-40 items-center justify-center gap-2 overflow-hidden rounded-soft border border-dashed border-border-control"
        >
          {photo ? (
            <ExpoImage
              source={{ uri: photo.uri }}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <>
              <Icon name="camera" size={24} color={muted} />
              <Text tone="muted">{copy.addPhoto}</Text>
            </>
          )}
          {uploading ? (
            <View className="absolute inset-0 items-center justify-center bg-bg/60">
              <ActivityIndicator accessibilityLabel={copy.uploading} />
            </View>
          ) : null}
        </Pressable>
        <RecordRows values={values} onField={setField} withName />
        {nameError && !values.label.trim() ? <ErrorText>{copy.nameFirst}</ErrorText> : null}
        {failed ? <ErrorText>{copy.failed}</ErrorText> : null}
        <Button loading={saving} disabled={uploading} onPress={() => void file()}>
          {wardrobe.add.file(to)}
        </Button>
      </ScrollView>
      <PieceFieldSheet
        piece={values}
        field={field}
        onClose={() => setField(null)}
        onSave={(input: UpdatePieceInput) => setChanges((c) => ({ ...c, ...rowChanges(input) }))}
        saving={false}
      />
    </PrimaryScope>
  );
}
