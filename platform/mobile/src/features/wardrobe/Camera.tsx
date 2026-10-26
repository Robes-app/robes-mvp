import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { palette } from '@robes/tokens';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier, useToast } from '@robes/ui-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type AddDestination, destinationOf, pickFromRoll, reviewHref } from './add/flow';
import { useShotSession } from './add/reads';
import { PICKER_OPTIONS } from './add-pieces';
import { downscale } from './camera-capture';

const copy = wardrobe.camera;
const add = wardrobe.add;
// A viewfinder is dark whatever the theme, so its chrome takes palette tokens, not the semantic
// ones that flip with the ground (the web camera takes the same decision).
const CHROME = palette.cream50;
const SUNK = `${palette.cream50}1F`;
const MARK = `${palette.cream50}BF`;
const FAINT = `${palette.cream50}59`;
const LABEL = {
  fontFamily: fonts.sansMedium,
  fontSize: 10,
  letterSpacing: 2.2,
  textTransform: 'uppercase',
} as const;

// "Take a photo" (design "Add Piece — Handoff"): the camera in the app. Every shot is read the
// moment it is taken — Robes counts what is in the frame, so one photo holds one piece or five —
// and the tray says what it has found. Review opens on them; nothing files from here. Where the
// pieces go (Mine / Wishlist) sits where Single / Several was. Web twin: components/wardrobe/camera.
export function Camera() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ to?: string }>();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [to, setTo] = useState<AddDestination>(() => destinationOf(params.to));
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

  // A refused camera still has the OS one behind it; its photo goes to Review like any shot.
  async function openOsCamera() {
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS).catch(() => null);
    if (!result) {
      toast.show({ message: wardrobe.addFailed });
      return;
    }
    if (result.canceled) {
      leave();
      return;
    }
    router.replace(
      reviewHref({
        to,
        from: 'camera',
        shots: result.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height })),
      }),
    );
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
  const destinations: [AddDestination, string][] = [
    ['wardrobe', add.shots.mine],
    ['wishlist', add.to.wishlist],
  ];
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
      {refused ? (
        <View
          style={{ backgroundColor: palette.ink900 }}
          className="absolute inset-0 items-center justify-center gap-4 p-6"
        >
          <Text
            accessibilityRole="alert"
            maxFontSizeMultiplier={maxFontSizeMultiplier.heading}
            style={{ fontFamily: fonts.displayItalic, fontSize: 20, color: CHROME }}
            className="text-center"
          >
            {copy.unreachable}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.useDevice}
            onPress={() => void openOsCamera()}
            style={{ minHeight: MIN_TOUCH, borderColor: MARK }}
            className="items-center justify-center rounded-pill border px-5"
          >
            <Text
              maxFontSizeMultiplier={maxFontSizeMultiplier.control}
              style={{ ...LABEL, color: CHROME }}
            >
              {copy.useDevice}
            </Text>
          </Pressable>
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
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={add.destination}
            style={{ backgroundColor: SUNK }}
            className="flex-row gap-[2px] rounded-pill p-[3px]"
          >
            {destinations.map(([value, label]) => {
              const on = to === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: on }}
                  onPress={() => setTo(value)}
                  hitSlop={{ top: 6, bottom: 6 }}
                  style={{
                    minWidth: 86,
                    height: 32,
                    backgroundColor: on ? CHROME : undefined,
                  }}
                  className="items-center justify-center rounded-pill px-3"
                >
                  <Text
                    maxFontSizeMultiplier={maxFontSizeMultiplier.control}
                    style={{ ...LABEL, fontSize: 9.5, color: on ? palette.ink : MARK }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
              accessibilityState={{ disabled: !ready || shooting }}
              disabled={!ready || shooting}
              onPress={shoot}
              testID="camera-shutter"
              style={{ borderColor: CHROME, opacity: ready && !shooting ? 1 : 0.4 }}
              className="size-[76px] rounded-pill border-[3px] p-[5px]"
            >
              <View style={{ backgroundColor: CHROME }} className="flex-1 rounded-pill" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={add.shots.review}
              accessibilityState={{ disabled: !canReview }}
              disabled={!canReview}
              onPress={review}
              style={{ minHeight: MIN_TOUCH, minWidth: 48 }}
              className="items-end justify-center px-1"
            >
              <Text
                maxFontSizeMultiplier={maxFontSizeMultiplier.control}
                style={{ ...LABEL, color: canReview ? CHROME : FAINT }}
              >
                {add.shots.review}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
