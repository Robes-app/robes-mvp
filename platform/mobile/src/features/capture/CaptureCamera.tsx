import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PICKER_OPTIONS, type PickedPhoto } from '@/features/wardrobe/add-pieces';
import { downscale } from '@/features/wardrobe/camera-capture';
import {
  Brackets,
  CAM_INK,
  CamDisc,
  CamPill,
  Flash,
  ReviewPill,
  Shutter,
  UseDisc,
} from './CameraParts';

// The flash a shot plays over the review (canvas `cxFlash`, .45s ease-out).
const FLASH_MS = 450;
const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

export interface CaptureCameraCopy {
  title: string;
  hint: string;
  close: string;
  photos: string;
  shutter: string;
  review: string;
  reviewNote: string;
  back: string;
  retake: string;
  use: string;
  denied: string;
  // The review as two pills (Add a photo to a look, Capture PRD 3.4): Retake reads this when the
  // photo came from her library, and reopens it.
  another?: string;
}

type Photo = { shot: PickedPhoto; from: 'camera' | 'library' };

// The camera for one photograph (Capture PRD 1c.1–1c.2; the canvas's frame 1c): the rear camera
// full screen — corner guides, the hint on glass, her photos bottom-left, the shutter — then the
// review of the still: back and Retake return to the viewfinder, the ink ✓ is Use photo. A shot
// flashes; a photo from her library does not. With the camera refused her photos still work.
// Web twin: app/src/components/capture/capture-camera.tsx.
export function CaptureCamera({
  copy,
  onUse,
  onClose,
  busy = false,
  error = null,
  review = 'discs',
}: {
  copy: CaptureCameraCopy;
  // `discs` (a look, canvas 1c): back top-left, Retake and the ink ✓. `pills` (a photo added to a
  // look, PRD 3.4): × stays, and Retake | ADD TO LOOK sit side by side; no flash, no question.
  review?: 'discs' | 'pills';
  onUse: (photo: PickedPhoto) => void;
  onClose: () => void;
  // Use photo is working (the upload): the review holds, its buttons stand down.
  busy?: boolean;
  error?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [flash, setFlash] = useState(0);
  const asked = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !asked.current) {
      asked.current = true;
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const pills = review === 'pills';

  async function shoot() {
    if (shooting || !ready) return;
    setShooting(true);
    try {
      const shot = await camera.current?.takePictureAsync({ exif: false });
      if (!shot) return;
      setPhoto({ shot: await downscale(shot), from: 'camera' });
      if (!pills) setFlash((n) => n + 1);
    } finally {
      setShooting(false);
    }
  }

  // The system photo picker: nothing to allow, and only what she picks reaches Robes.
  async function library() {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const picked = result.canceled ? undefined : result.assets[0];
    if (picked) setPhoto({ shot: picked, from: 'library' });
  }

  const retake = () => {
    setReady(false);
    setPhoto(null);
  };
  // Another: her library again, the still held until she picks or cancels.
  const again = () => (photo?.from === 'library' ? void library() : retake());
  // The hook answers undefined before it has read the status, not just null.
  const live = !!permission?.granted;
  const denied = !!permission && !permission.granted;
  const refused = denied && !permission.canAskAgain;
  const top = insets.top + 12;
  const bottom = insets.bottom + 36;

  return (
    <View
      accessibilityViewIsModal
      accessibilityLabel={photo ? copy.review : copy.title}
      style={{ flex: 1, backgroundColor: CAM_INK }}
      testID={photo ? 'capture-review' : 'capture-camera'}
    >
      {photo ? (
        <Image
          source={{ uri: photo.shot.uri }}
          contentFit="cover"
          accessible={false}
          style={FILL}
        />
      ) : live ? (
        <CameraView
          ref={camera}
          facing="back"
          mode="picture"
          onCameraReady={() => setReady(true)}
          style={FILL}
        />
      ) : null}
      <Flash at={flash} ms={FLASH_MS} />
      {photo ? null : (
        <Brackets inset={{ left: 40, right: 40, top: top + 60, bottom: bottom + 160 }} />
      )}
      <View style={{ position: 'absolute', top, left: 16 }}>
        <CamDisc
          icon={photo && !pills ? 'back' : 'close'}
          label={photo && !pills ? copy.back : copy.close}
          onPress={photo && !pills ? retake : onClose}
          disabled={busy}
          testID="capture-close"
        />
      </View>
      {/* The camera refused (PRD 1c.1): the line says how to allow it, and her photos still work. */}
      {!photo && denied ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.denied}
          onPress={() => (refused ? void Linking.openSettings() : void requestPermission())}
          style={{ position: 'absolute', left: 32, right: 32, top: '33%' }}
          testID="capture-denied"
        >
          <CamPill text={copy.denied} alert />
        </Pressable>
      ) : null}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom, gap: 22 }}
      >
        {error ? (
          <CamPill text={error} alert />
        ) : photo && pills ? null : (
          <CamPill text={photo ? copy.reviewNote : copy.hint} />
        )}
        {photo && pills ? (
          <View className="flex-row" style={{ gap: 10, paddingHorizontal: 20 }}>
            <ReviewPill
              label={photo.from === 'library' ? (copy.another ?? copy.retake) : copy.retake}
              onPress={again}
              disabled={busy}
              testID="capture-retake"
            />
            <ReviewPill
              ink
              label={copy.use}
              onPress={() => onUse(photo.shot)}
              disabled={busy}
              busy={busy}
              testID="capture-use"
            />
          </View>
        ) : (
          <View
            pointerEvents="box-none"
            className="flex-row items-center"
            style={{ paddingHorizontal: 32 }}
          >
            <View className="flex-1 items-start">
              {photo ? (
                <CamDisc
                  icon="refresh"
                  label={copy.retake}
                  onPress={retake}
                  size={48}
                  disabled={busy}
                  testID="capture-retake"
                />
              ) : (
                <CamDisc
                  icon="image"
                  label={copy.photos}
                  onPress={() => void library()}
                  size={48}
                  testID="capture-photos"
                />
              )}
            </View>
            {photo ? (
              <UseDisc
                label={copy.use}
                busy={busy}
                disabled={busy}
                onPress={() => onUse(photo.shot)}
                testID="capture-use"
              />
            ) : (
              <Shutter
                label={copy.shutter}
                disabled={!live || !ready}
                onPress={() => void shoot()}
                testID="capture-shutter"
              />
            )}
            <View className="flex-1" />
          </View>
        )}
      </View>
    </View>
  );
}
