import { Icon } from '@robes/icons/native';
import { palette } from '@robes/tokens';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier, useToast } from '@robes/ui-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickFromRoll } from '@/features/wardrobe/add/flow';
import { downscale } from '@/features/wardrobe/camera-capture';
import { Brackets, CAM_CREAM, CAM_INK, CamDisc, CamPill, Flash, Shutter } from './CameraParts';

// The flash a shot plays (Capture PRD 3c.2: 380 ms).
const FLASH_MS = 380;
const LABEL = {
  fontFamily: fonts.sansMedium,
  fontSize: 10,
  letterSpacing: 2,
  textTransform: 'uppercase',
} as const;

export interface ShotCameraCopy {
  title: string;
  close: string;
  shutter: string;
  photos: string;
  hint: string;
  next: string;
  full: string;
  denied: string;
  allow: string;
  failed: string;
  ready: (n: number) => string;
  done: (n: number) => string;
  taken: (n: number) => string;
  // Set when a tap on a thumbnail takes that photograph off the strip (onboarding R-5.2).
  remove?: string;
  // Set when the caller uploads each shot and passes its `upload` state: the pill counts what has
  // landed while any is on its way, and a thumbnail that failed says so.
  uploaded?: (n: number, total: number) => string;
  notUploaded?: string;
}

export interface CameraShot {
  key: string;
  uri: string;
  // Still uploading (a spinner where the tick goes) or given up (left out of `done`'s count).
  upload?: 'pending' | 'failed';
}

export type CameraPhoto = { uri: string; width: number; height: number };

// The camera for several photographs (Capture PRD 3c.2; canvas frame 3c), shared by Wardrobe ›
// Photo and Getting to know you's Saved looks and Pieces you love: the viewfinder stays open
// between shots. Each shot flashes and joins the strip above the controls with a sage tick; from
// the first one the counter says how many are ready, the hint moves on, and the ink pill (`done`)
// hands the sitting on. Her photos (several at once) join it too. What a shot becomes is the
// caller's: `onAdd` starts it on its way, `canDone` says when every one is. Web twin:
// app/src/components/wardrobe/camera.tsx.
export function ShotCamera({
  copy,
  shots,
  max,
  canDone,
  onAdd,
  onRemove,
  onDone,
  onClose,
  rollFirst = false,
}: {
  copy: ShotCameraCopy;
  // Opens her photos at once (Saved looks' "Choose saved looks"), the camera behind them.
  rollFirst?: boolean;
  shots: readonly CameraShot[];
  max: number;
  canDone: boolean;
  onAdd: (photo: CameraPhoto) => void;
  onRemove?: (key: string) => void;
  onDone: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [flash, setFlash] = useState(0);
  const asked = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !asked.current) {
      asked.current = true;
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const full = shots.length >= max;
  const pending = shots.filter((s) => s.upload === 'pending').length;
  const savable = shots.filter((s) => s.upload !== 'failed').length;
  const rolled = useRef(false);
  useEffect(() => {
    if (!rollFirst || rolled.current) return;
    rolled.current = true;
    void roll();
  });

  async function shoot() {
    if (shooting || !ready || full) return;
    setShooting(true);
    try {
      const shot = await camera.current?.takePictureAsync({ exif: false });
      if (shot) {
        setFlash((n) => n + 1);
        onAdd(await downscale(shot));
      }
    } catch {
      toast.show({ message: copy.failed });
    } finally {
      setShooting(false);
    }
  }

  async function roll() {
    const picked = await pickFromRoll();
    for (const photo of (picked ?? []).slice(0, Math.max(0, max - shots.length))) onAdd(photo);
  }

  const refused = !!permission && !permission.granted && !permission.canAskAgain;
  const live = !!permission?.granted;
  return (
    <View
      accessibilityViewIsModal
      accessibilityLabel={copy.title}
      style={{ flex: 1, backgroundColor: CAM_INK }}
    >
      {/* Full bleed: the live view runs edge to edge, the chrome floats over it. */}
      {live ? (
        <CameraView
          ref={camera}
          facing="back"
          mode="picture"
          onCameraReady={() => setReady(true)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      <Flash at={flash} ms={FLASH_MS} />
      <Brackets
        inset={{ left: 46, right: 46, top: insets.top + 96, bottom: insets.bottom + 278 }}
      />
      <View style={{ position: 'absolute', top: insets.top + 12, left: 16 }}>
        <CamDisc icon="close" label={copy.close} onPress={onClose} testID="piece-camera-close" />
      </View>
      {shots.length ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            top: insets.top + 16,
            alignSelf: 'center',
            backgroundColor: `${palette.cream50}F2`,
            paddingHorizontal: 16,
            paddingVertical: 9,
          }}
          className="rounded-pill"
        >
          <Text
            maxFontSizeMultiplier={maxFontSizeMultiplier.control}
            style={{ ...LABEL, color: CAM_INK }}
          >
            {copy.ready(shots.length)}
          </Text>
        </View>
      ) : null}
      {/* Never a blank viewfinder (redline 03): the way to allow the camera when it is off. */}
      {permission && !live ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 24, right: 24, top: '33%' }}
          className="items-center gap-4"
        >
          <CamPill text={copy.denied} alert />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.allow}
            onPress={() => (refused ? void Linking.openSettings() : void requestPermission())}
            style={{ minHeight: MIN_TOUCH, borderColor: `${palette.cream50}66` }}
            className="items-center justify-center rounded-pill border px-5"
          >
            <Text
              maxFontSizeMultiplier={maxFontSizeMultiplier.control}
              style={{ ...LABEL, color: CAM_CREAM }}
            >
              {copy.allow}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 36 }}
        className="gap-4"
      >
        <CamPill
          text={
            pending && copy.uploaded
              ? copy.uploaded(shots.length - pending, shots.length)
              : full
                ? copy.full
                : shots.length
                  ? copy.next
                  : copy.hint
          }
        />
        {/* The sitting so far: each shot with its sage tick, newest at the right. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityLabel={copy.taken(shots.length)}
          style={{ height: 60, opacity: shots.length ? 1 : 0 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 28 }}
        >
          {shots.map((shot) => (
            <Pressable
              key={shot.key}
              testID="piece-camera-thumb"
              accessible={!!onRemove}
              accessibilityRole={onRemove ? 'button' : undefined}
              accessibilityLabel={
                onRemove
                  ? shot.upload === 'failed' && copy.notUploaded
                    ? `${copy.notUploaded}. ${copy.remove}`
                    : copy.remove
                  : undefined
              }
              disabled={!onRemove}
              onPress={() => onRemove?.(shot.key)}
              style={{
                width: 48,
                height: 60,
                borderRadius: 4,
                borderWidth: 1.5,
                borderColor: palette.white,
                overflow: 'hidden',
              }}
            >
              <Image
                source={{ uri: shot.uri }}
                contentFit="cover"
                accessible={false}
                style={{
                  width: '100%',
                  height: '100%',
                  opacity: shot.upload === 'failed' ? 0.5 : 1,
                }}
              />
              {/* The sage tick once it has landed; until then a spinner, and a rose mark if it
                  couldn't. */}
              <View
                testID={shot.upload ? `piece-camera-thumb-${shot.upload}` : undefined}
                style={{
                  position: 'absolute',
                  right: 2,
                  bottom: 2,
                  width: 16,
                  height: 16,
                  backgroundColor:
                    shot.upload === 'pending'
                      ? CAM_INK
                      : shot.upload === 'failed'
                        ? palette.rose
                        : palette.sage,
                }}
                className="items-center justify-center rounded-pill"
              >
                {shot.upload === 'pending' ? (
                  <ActivityIndicator
                    size="small"
                    color={palette.white}
                    style={{ transform: [{ scale: 0.55 }] }}
                  />
                ) : (
                  <Icon
                    name={shot.upload === 'failed' ? 'alert' : 'check'}
                    size={10}
                    color={palette.white}
                  />
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
        <View
          pointerEvents="box-none"
          className="flex-row items-center"
          style={{ paddingHorizontal: 28 }}
        >
          <View className="flex-1 items-start">
            <CamDisc
              icon="image"
              label={copy.photos}
              onPress={() => void roll()}
              size={48}
              testID="piece-camera-photos"
            />
          </View>
          <Shutter
            label={copy.shutter}
            disabled={!live || full}
            onPress={() => void shoot()}
            testID="camera-shutter"
          />
          <View className="flex-1 items-end">
            {shots.length ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.done(savable)}
                accessibilityState={{ disabled: !canDone }}
                disabled={!canDone}
                onPress={onDone}
                testID="piece-camera-review"
                style={{
                  height: 48,
                  backgroundColor: CAM_INK,
                  opacity: canDone ? 1 : 0.6,
                  shadowColor: palette.ink,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 14,
                  shadowOpacity: 0.25,
                  elevation: 4,
                }}
                className="items-center justify-center rounded-pill px-5"
              >
                <Text
                  maxFontSizeMultiplier={maxFontSizeMultiplier.control}
                  style={{ ...LABEL, color: CAM_CREAM }}
                >
                  {copy.done(savable)}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
