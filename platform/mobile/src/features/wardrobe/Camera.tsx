import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { palette } from '@robes/tokens';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier, useToast } from '@robes/ui-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Brackets,
  CAM_CREAM,
  CAM_INK,
  CamDisc,
  CamPill,
  Flash,
  Shutter,
} from '@/features/capture/CameraParts';
import { nativeAnalytics } from '@/lib/analytics';
import { destinationOf, pickFromRoll, REVIEW_MAX, reviewHref, sitting } from './add/flow';
import { useShotSession } from './add/reads';
import { downscale } from './camera-capture';

const copy = wardrobe.capture.camera;
const old = wardrobe.camera;
// The flash a shot plays (Capture PRD 3c.2: 380 ms).
const FLASH_MS = 380;
const LABEL = {
  fontFamily: fonts.sansMedium,
  fontSize: 10,
  letterSpacing: 2,
  textTransform: 'uppercase',
} as const;

// Wardrobe › Photo, the camera (Capture PRD 3c.2; canvas frame 3c): the viewfinder stays open
// between shots. Each shot flashes, starts its read and joins the strip above the controls with
// a sage tick; from the first one the counter says how many are ready, the hint moves on, and
// the ink REVIEW n pill opens the review over the camera, so coming back keeps the sitting. Her
// photos (several at once) join it too. Nothing files from here; closing with shots asks first.
// The look camera shares its parts (features/capture). Web twin: components/wardrobe/camera.tsx.
export function Camera() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ to?: string }>();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const to = destinationOf(params.to);
  const [ready, setReady] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [flash, setFlash] = useState(0);
  const session = useShotSession();
  const { shots, reset } = session;
  const asked = useRef(false);
  useEffect(() => nativeAnalytics.track('camera_opened'), []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !asked.current) {
      asked.current = true;
      void requestPermission();
    }
  }, [permission, requestPermission]);

  // Back from a Review that emptied or filed the sitting: the camera starts afresh.
  useFocusEffect(
    useCallback(() => {
      if (sitting.takeEmptied()) reset();
    }, [reset]),
  );

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/wardrobe');
  }, [router]);

  const full = shots.length >= REVIEW_MAX;
  // Review opens once every photograph is on its way to being read (uploaded, or failed).
  const canReview = shots.length > 0 && shots.every((s) => s.jobId || s.failed);
  const review = () => {
    if (!canReview) return;
    nativeAnalytics.track('camera_filed', { n: shots.length });
    router.push(
      reviewHref({
        to,
        from: 'camera',
        shots: shots.flatMap((s) =>
          s.jobId ? [{ uri: s.uri, width: s.width, height: s.height, jobId: s.jobId }] : [],
        ),
      }),
    );
  };

  async function shoot() {
    if (shooting || !ready || full) return;
    setShooting(true);
    try {
      const shot = await camera.current?.takePictureAsync({ exif: false });
      if (shot) {
        setFlash((n) => n + 1);
        void session.add(await downscale(shot));
      }
    } catch {
      toast.show({ message: wardrobe.addFailed });
    } finally {
      setShooting(false);
    }
  }

  // Her photos, several at once, join this sitting up to its limit.
  async function roll() {
    const picked = await pickFromRoll();
    for (const photo of (picked ?? []).slice(0, Math.max(0, REVIEW_MAX - shots.length))) {
      void session.add(photo);
    }
  }

  // Nothing taken is dropped without a word.
  function close() {
    if (shots.length === 0) {
      leave();
      return;
    }
    Alert.alert(old.leave(shots.length), old.leaveBody, [
      { text: old.stay, style: 'cancel' },
      { text: old.leaveConfirm, style: 'destructive', onPress: leave },
    ]);
  }

  // The hook answers undefined before it has read the status, not just null.
  const refused = !!permission && !permission.granted && !permission.canAskAgain;
  const live = !!permission?.granted;
  return (
    <View
      accessibilityViewIsModal
      accessibilityLabel={old.title}
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
        <CamDisc icon="close" label={copy.close} onPress={close} testID="piece-camera-close" />
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
            accessibilityLabel={old.allow}
            onPress={() => (refused ? void Linking.openSettings() : void requestPermission())}
            style={{ minHeight: MIN_TOUCH, borderColor: `${palette.cream50}66` }}
            className="items-center justify-center rounded-pill border px-5"
          >
            <Text
              maxFontSizeMultiplier={maxFontSizeMultiplier.control}
              style={{ ...LABEL, color: CAM_CREAM }}
            >
              {old.allow}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 36 }}
        className="gap-4"
      >
        <CamPill text={full ? copy.full : shots.length ? copy.next : copy.hint} />
        {/* The sitting so far: each shot with its sage tick, newest at the right. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityLabel={old.taken(shots.length)}
          style={{ height: 60, opacity: shots.length ? 1 : 0 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 28 }}
        >
          {shots.map((shot) => (
            <View
              key={shot.key}
              testID="piece-camera-thumb"
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
                style={{ width: '100%', height: '100%' }}
              />
              <View
                style={{
                  position: 'absolute',
                  right: 2,
                  bottom: 2,
                  width: 16,
                  height: 16,
                  backgroundColor: palette.sage,
                }}
                className="items-center justify-center rounded-pill"
              >
                <Icon name="check" size={10} color={palette.white} />
              </View>
            </View>
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
                accessibilityLabel={copy.review(shots.length)}
                accessibilityState={{ disabled: !canReview }}
                disabled={!canReview}
                onPress={review}
                testID="piece-camera-review"
                style={{
                  height: 48,
                  backgroundColor: CAM_INK,
                  opacity: canReview ? 1 : 0.6,
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
                  {copy.review(shots.length)}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
