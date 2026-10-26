import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { PieceValues, UpdatePieceInput } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import {
  type RowChanges,
  readDraft,
  rowChanges,
  suggestName,
  wishChanges,
} from '@robes/core/add-flow';
import { Icon } from '@robes/icons/native';
import {
  Button,
  Em,
  ErrorText,
  Heading,
  PrimaryScope,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { PinnedAction } from '@/components/PinnedAction';
import { PICKER_OPTIONS, uploadPhoto } from '../add-pieces';
import { type PieceField, PieceFieldSheet } from '../PieceFieldSheet';
import { RecordRows } from '../PieceRows';
import type { AddDestination, ReviewShot } from './flow';
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

// Add without a photo (design "Add Piece — Handoff", redlines 06/07): the record's sections as
// rows, each opening its drawer, a 64pt dashed "Add a photo later" row at the end, and the one
// commit pinned at the foot — which waits for a category, and names the piece from it when she
// leaves the name blank. A read that never landed arrives here with its photo. Web twin:
// components/wardrobe/add/manual-add.tsx.
export function ManualAdd({ to, photo: initial }: { to: AddDestination; photo?: ReviewShot }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const muted = useColor('ink-muted');
  const [changes, setChanges] = useState<RowChanges>({});
  const [field, setField] = useState<PieceField | null>(null);
  const [photo, setPhoto] = useState<{ uri: string; assetId: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const values = { ...EMPTY, ...changes } as PieceValues;

  const attached = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the photo she arrived with, once.
  useEffect(() => {
    if (initial && !attached.current) {
      attached.current = true;
      void attach(initial);
    }
  }, []);

  async function addPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.show({ message: wardrobe.photosDenied });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) await attach(asset);
  }

  async function attach(asset: { uri: string }) {
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
    const label = values.label.trim() || suggested;
    if (!label) return;
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
  const suggested = suggestName(values) ?? '';
  const ready = !!values.categoryL2 && !uploading;
  return (
    <PrimaryScope>
      <ScrollView contentContainerClassName="gap-5 px-6 pb-12">
        <Heading size="md" style={{ fontSize: 28 }}>
          {copy.title} <Em>{copy.wink}</Em>
        </Heading>
        <RecordRows values={values} onField={setField} withName />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={photo ? copy.changePhoto : copy.addPhoto}
          onPress={() => void addPhoto()}
          disabled={uploading}
          style={{ minHeight: 64 }}
          className="flex-row items-center gap-4 overflow-hidden rounded-soft border border-dashed border-border-control px-4"
        >
          {photo ? (
            <ExpoImage
              source={{ uri: photo.uri }}
              contentFit="cover"
              style={{ width: 48, height: 48, borderRadius: 4 }}
            />
          ) : (
            <Icon name="camera" size={20} color={muted} />
          )}
          <Text tone="muted" className="flex-1">
            {photo ? copy.changePhoto : copy.addPhoto}
          </Text>
          {uploading ? <ActivityIndicator accessibilityLabel={copy.uploading} /> : null}
        </Pressable>
        {failed ? <ErrorText>{copy.failed}</ErrorText> : null}
      </ScrollView>
      <PinnedAction>
        <Button loading={saving} disabled={!ready} onPress={() => void file()}>
          {wardrobe.add.file(to)}
        </Button>
      </PinnedAction>
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
