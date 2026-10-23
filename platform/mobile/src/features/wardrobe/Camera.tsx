import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { palette } from '@robes/tokens';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier, useToast } from '@robes/ui-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addedHref, PICKER_OPTIONS, type PickedPhoto, useAddPieces } from './add-pieces';
import { CAMERA_MODES, type CameraMode, downscale, readMode, rememberMode } from './camera-capture';

const copy = wardrobe.camera;
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

// "Take a photo" (legacy bc56305): the camera in the app rather than the OS one. Single files its
// one shot straight into the read; Several keeps shooting and Done hands the lot to the batch.
export function Camera() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { file, busy } = useAddPieces();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<CameraMode>('single');
  const [shots, setShots] = useState<PickedPhoto[]>([]);
  const [ready, setReady] = useState(false);
  const asked = useRef(false);

  useEffect(() => {
    // shortcut: `camera_opened { mode }` isn't in the @robes/analytics catalogue yet, and
    // packages/ are outside this change — add it there and capture it here.
    void readMode().then(setMode);
  }, []);

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

  // The one filing path: the batch reads one piece after another, as the photo library's does.
  const send = useCallback(
    async (photos: PickedPhoto[]) => {
      // shortcut: `camera_filed { mode, n }` isn't in the @robes/analytics catalogue yet, and
      // packages/ are outside this change — add it there and capture it here.
      const result = await file(photos);
      if (result.status === 'added') {
        router.replace(addedHref(result.ids));
        return;
      }
      if (result.status !== 'cancelled') toast.show({ message: result.message });
      leave();
    },
    [file, leave, router, toast],
  );

  function pickMode(next: CameraMode) {
    setMode(next);
    rememberMode(next);
  }

  async function shoot() {
    let photo: PickedPhoto;
    try {
      const shot = await camera.current?.takePictureAsync({ exif: false });
      if (!shot) return;
      photo = await downscale(shot);
    } catch {
      toast.show({ message: wardrobe.addFailed });
      return;
    }
    // Single hands its one shot straight to the read; Several collects.
    if (mode === 'single') {
      void send([photo]);
      return;
    }
    setShots((taken) => [...taken, photo]);
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

  // A refused camera still has the OS one behind it.
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
    void send(result.assets);
  }

  // The hook answers undefined before it has read the status, not just null.
  const refused = !!permission && !permission.granted && !permission.canAskAgain;
  const last = shots.at(-1);
  const several = mode === 'several';
  return (
    <View
      accessibilityViewIsModal
      accessibilityLabel={copy.title}
      style={{
        flex: 1,
        backgroundColor: palette.ink900,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View className="mx-auto w-full max-w-[520px] flex-1 px-4 pt-2 pb-3">
        <View className="h-14 flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            onPress={close}
            style={{ width: MIN_TOUCH, height: MIN_TOUCH }}
            className="items-center justify-center rounded-pill"
          >
            <Icon name="close" size={22} color={CHROME} />
          </Pressable>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={copy.mode}
            style={{ backgroundColor: SUNK }}
            className="flex-row gap-[2px] rounded-pill p-[3px]"
          >
            {CAMERA_MODES.map((option) => {
              const on = mode === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityLabel={copy[option]}
                  accessibilityState={{ checked: on }}
                  onPress={() => pickMode(option)}
                  hitSlop={{ top: 6, bottom: 6 }}
                  style={{
                    minWidth: 86,
                    height: 32,
                    backgroundColor: on ? palette.warm : undefined,
                  }}
                  className="items-center justify-center rounded-pill px-3"
                >
                  <Text
                    maxFontSizeMultiplier={maxFontSizeMultiplier.control}
                    style={{ ...LABEL, fontSize: 9.5, color: on ? palette.ink : MARK }}
                  >
                    {copy[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ width: MIN_TOUCH }} />
        </View>
        <View className="mt-2 flex-1 overflow-hidden rounded-soft">
          {permission?.granted ? (
            <CameraView
              ref={camera}
              facing="back"
              mode="picture"
              // Released while the shots upload, so the preview isn't held open for nothing.
              active={!busy}
              onCameraReady={() => setReady(true)}
              style={{ flex: 1 }}
            />
          ) : null}
          {[
            { top: 18, left: 18, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
            { top: 18, right: 18, borderTopWidth: 1.5, borderRightWidth: 1.5 },
            { bottom: 18, left: 18, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
            { bottom: 18, right: 18, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
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
          {busy ? (
            <View
              style={{ backgroundColor: `${palette.ink900}CC` }}
              className="absolute inset-0 items-center justify-center"
            >
              <ActivityIndicator color={CHROME} />
            </View>
          ) : null}
        </View>
        <View className="h-28 flex-row items-center justify-between">
          <View className="w-12">
            {last ? (
              // The last shot, so she can see what Robes has; the count says how many.
              <View
                accessible
                accessibilityLabel={copy.taken(shots.length)}
                style={{ borderColor: MARK }}
                className="h-[60px] w-12 overflow-hidden rounded-[8px] border"
              >
                <Image source={{ uri: last.uri }} contentFit="cover" style={{ flex: 1 }} />
                <Text
                  maxFontSizeMultiplier={maxFontSizeMultiplier.control}
                  style={{
                    ...LABEL,
                    letterSpacing: 0,
                    color: palette.ink,
                    backgroundColor: palette.warm,
                  }}
                  className="absolute right-[3px] bottom-[3px] min-w-[18px] rounded-pill px-[5px] text-center leading-[18px]"
                >
                  {shots.length}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.shutter}
            accessibilityState={{ disabled: !ready || busy }}
            disabled={!ready || busy}
            onPress={shoot}
            testID="camera-shutter"
            style={{ borderColor: CHROME, opacity: ready && !busy ? 1 : 0.4 }}
            className="size-[74px] rounded-pill border-[3px] p-[5px]"
          >
            <View style={{ backgroundColor: CHROME }} className="flex-1 rounded-pill" />
          </Pressable>
          <View className="w-12 items-end">
            {several ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.done}
                accessibilityState={{ disabled: shots.length === 0 || busy }}
                disabled={shots.length === 0 || busy}
                onPress={() => void send(shots)}
                style={{ minHeight: MIN_TOUCH }}
                className="justify-center px-1"
              >
                <Text
                  maxFontSizeMultiplier={maxFontSizeMultiplier.control}
                  style={{ ...LABEL, color: shots.length === 0 ? FAINT : CHROME }}
                >
                  {copy.done}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
