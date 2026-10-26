import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { palette } from '@robes/tokens';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier, useToast } from '@robes/ui-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { destinationOf, pickFromRoll, reviewHref } from './add/flow';
import { useShotSession } from './add/reads';
import { downscale } from './camera-capture';

const copy = wardrobe.camera;
const add = wardrobe.add;
// A viewfinder is dark whatever the theme, so its chrome takes palette tokens, not the semantic
// ones that flip with the ground (the web camera takes the same decision).
const CHROME = palette.cream50;
const SUNK = `${palette.cream50}1F`;
const MARK = `${palette.cream50}BF`;
const FAINT = `${palette.cream50}59`;
const SOFT = `${palette.cream50}B3`;
const LABEL = {
  fontFamily: fonts.sansMedium,
  fontSize: 10,
  letterSpacing: 2.2,
  textTransform: 'uppercase',
} as const;

// "Take a photo" (design "Add Piece — Handoff"): the camera in the app. Every shot is read the
// moment it is taken — Robes counts what is in the frame, so one photo holds one piece or five —
// and the tray says what it has found. Review opens on them; nothing files from here, and where
// they go was chosen on the Add pieces sheet (redline 03). Web twin: components/wardrobe/camera.
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
  const session = useShotSession();
  const { shots } = session;
  const asked = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !asked.current) {
      asked.current = true;
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/wardrobe');
  }, [router]);

  const review = () => {
    if (shots.length === 0 || session.reading) return;
    router.replace(
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
    setShooting(true);
    if (shooting || !ready) return;
    try {
      const shot = await camera.current?.takePictureAsync({ exif: false });
      if (shot) void session.add(await downscale(shot));
    } catch {
      toast.show({ message: wardrobe.addFailed });
    } finally {
      setShooting(false);
    }
  }

  // The last-photo thumb is the way to the camera roll; picks join this session's shots.
  async function roll() {
    const picked = await pickFromRoll();
    if (picked === 'denied') {
      toast.show({ message: wardrobe.photosDenied });
      return;
    }
    for (const photo of picked ?? []) void session.add(photo);
  }

  // Nothing taken is dropped without a word.
  function close() {
    if (shots.length === 0) {
      leave();
      return;
    }
    Alert.alert(copy.leave(shots.length), copy.leaveBody, [
      { text: copy.stay, style: 'cancel' },
      { text: copy.leaveConfirm, style: 'destructive', onPress: leave },
    ]);
  }

  // The hook answers undefined before it has read the status, not just null.
  const refused = !!permission && !permission.granted && !permission.canAskAgain;
  const last = shots.at(-1);
  const canReview = shots.length > 0 && !session.reading;
  const tray = shots.length
    ? session.reading
      ? add.shots.reading
      : add.shots.found(session.found)
    : '';
  const live = !!permission?.granted;
  return (
    <View
      accessibilityViewIsModal
      accessibilityLabel={copy.title}
      style={{ flex: 1, backgroundColor: palette.ink900 }}
    >
      {/* Full bleed: the live view runs edge to edge, the chrome floats over it. */}
      {permission?.granted ? (
        <CameraView
          ref={camera}
          facing="back"
          mode="picture"
          onCameraReady={() => setReady(true)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      {[
        { top: insets.top + 84, left: 28, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
        { top: insets.top + 84, right: 28, borderTopWidth: 1.5, borderRightWidth: 1.5 },
        { bottom: insets.bottom + 170, left: 28, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
        { bottom: insets.bottom + 170, right: 28, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
      ].map((corner, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: four fixed framing marks.
          key={i}
          aria-hidden
          pointerEvents="none"
          style={{ position: 'absolute', width: 26, height: 26, borderColor: MARK, ...corner }}
        />
      ))}
      {/* Never a blank viewfinder (redline 03): a line while the camera opens, and the way to
          Settings when she refused it. */}
      {!live || !ready ? (
        <View
          pointerEvents="box-none"
          className="absolute inset-0 items-center justify-center gap-4 p-6"
        >
          <Text
            {...(refused ? { accessibilityRole: 'alert' as const } : {})}
            maxFontSizeMultiplier={maxFontSizeMultiplier.heading}
            style={{ fontFamily: fonts.displayItalic, fontSize: 20, color: CHROME }}
            className="text-center"
          >
            {refused ? copy.unreachable : copy.waiting}
          </Text>
          {refused || (permission && !permission.granted) ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.allow}
              onPress={() => (refused ? void Linking.openSettings() : void requestPermission())}
              style={{ minHeight: MIN_TOUCH, borderColor: MARK }}
              className="items-center justify-center rounded-pill border px-5"
            >
              <Text
                maxFontSizeMultiplier={maxFontSizeMultiplier.control}
                style={{ ...LABEL, color: CHROME }}
              >
                {copy.allow}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
        className="mx-auto w-full max-w-[520px] justify-between px-4 pt-2 pb-3"
      >
        <View className="h-14 flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            onPress={close}
            style={{ width: MIN_TOUCH, height: MIN_TOUCH, backgroundColor: SUNK }}
            className="items-center justify-center rounded-pill"
          >
            <Icon name="close" size={22} color={CHROME} />
          </Pressable>
          <View style={{ width: MIN_TOUCH }} />
        </View>

        <View pointerEvents="box-none" className="gap-3">
          <Text
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={maxFontSizeMultiplier.control}
            style={{ ...LABEL, letterSpacing: 1.6, color: CHROME, minHeight: 16 }}
            className="text-center"
          >
            {tray}
          </Text>
          <View className="h-28 flex-row items-center justify-between">
            {/* The last shot, so she can see what Robes has; a tap opens the camera roll. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={add.shots.roll}
              onPress={() => void roll()}
              style={{ borderColor: MARK, backgroundColor: SUNK }}
              className="h-[60px] w-12 items-center justify-center overflow-hidden rounded-[8px] border"
            >
              {last ? (
                <Image
                  source={{ uri: last.uri }}
                  contentFit="cover"
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <Icon name="image" size={20} color={CHROME} />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.shutter}
              accessibilityState={{ disabled: !live }}
              disabled={!live}
              onPress={shoot}
              testID="camera-shutter"
              style={{ borderColor: CHROME, opacity: live ? 1 : 0.4 }}
              className="size-[72px] rounded-pill border-2 p-1"
            >
              <View style={{ backgroundColor: CHROME }} className="flex-1 rounded-pill" />
            </Pressable>
            {shots.length ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={add.shots.review(shots.length)}
                accessibilityState={{ disabled: !canReview }}
                disabled={!canReview}
                onPress={review}
                style={{ minHeight: MIN_TOUCH, minWidth: 48 }}
                className="items-end justify-center px-1"
              >
                <Text
                  maxFontSizeMultiplier={maxFontSizeMultiplier.control}
                  style={{ ...LABEL, color: canReview ? SOFT : FAINT }}
                >
                  {add.shots.review(shots.length)}
                </Text>
              </Pressable>
            ) : (
              <View style={{ minWidth: 48 }} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
