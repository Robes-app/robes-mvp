import { twin, wardrobe } from '@robes/copy';
import { Icon, type IconName } from '@robes/icons/native';
import { palette } from '@robes/tokens';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier } from '@robes/ui-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { PICKER_OPTIONS, type PickedPhoto } from '@/features/wardrobe/add-pieces';
import { downscale } from '@/features/wardrobe/camera-capture';
import { useSelfieSend } from './use-selfie';

const copy = twin.twinPage.selfie;
const cam = wardrobe.camera;
// A viewfinder is dark whatever the theme, so its chrome takes palette tokens, not the semantic
// ones that flip with the ground (as the wardrobe camera does).
const CREAM = palette.cream50;
const INK = palette.ink900;
const VEIL = `${palette.ink900}8C`;
const DIM = `${palette.ink900}59`;
const LABEL = {
  fontFamily: fonts.sansMedium,
  fontSize: 12,
  letterSpacing: 2.4,
  textTransform: 'uppercase',
} as const;
// The face guide (design 03): an oval a little over half the width, its centre a little above a
// third of the way down, the frame outside it dimmed.
const OVAL = { width: 0.62, ratio: 1.29, centreY: 0.31 };

type Source = 'camera' | 'library';

// The selfie camera (designs 03–05, Annie 10 Nov): the front camera under a face guide, her photo
// library a tap away (the system picker, design 04), then the review (05): Retake goes back to
// where the photo came from, Use photo reads it and opens Your digital twin. Web twin:
// app/src/app/(app)/you/selfie/selfie-camera.tsx.
export function SelfieCamera() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [ready, setReady] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [photo, setPhoto] = useState<{ shot: PickedPhoto; from: Source } | null>(null);
  const { send, busy, error } = useSelfieSend();
  const asked = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !asked.current) {
      asked.current = true;
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/you/model');
  };

  async function shoot() {
    if (shooting || !ready) return;
    setShooting(true);
    try {
      const shot = await camera.current?.takePictureAsync({ exif: false });
      if (shot) setPhoto({ shot: await downscale(shot), from: 'camera' });
    } finally {
      setShooting(false);
    }
  }

  // The system photo picker (design 04): nothing to allow, and only what she picks reaches Robes.
  async function library() {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const picked = result.canceled ? undefined : result.assets[0];
    if (picked) setPhoto({ shot: picked, from: 'library' });
    return picked !== undefined;
  }

  // Back to where the photo came from: the picker again, or the camera if she leaves it empty.
  async function retake() {
    const from = photo?.from;
    setPhoto(null);
    if (from === 'library') await library();
  }

  if (photo) {
    return (
      <View
        accessibilityViewIsModal
        accessibilityLabel={copy.review}
        style={{ flex: 1, backgroundColor: INK }}
        testID="selfie-review"
      >
        <Image
          source={{ uri: photo.shot.uri }}
          contentFit="cover"
          accessible={false}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          pointerEvents="box-none"
          style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
          className="justify-between px-5 pt-2 pb-4"
        >
          <Round icon="close" label={copy.close} onPress={close} testID="selfie-close" />
          <View className="gap-4">
            {error ? <Pill text={error} alert /> : <Pill text={copy.reviewNote} />}
            <View className="flex-row gap-3">
              <Wide
                label={copy.retake}
                tone="light"
                disabled={busy}
                onPress={() => void retake()}
                testID="selfie-retake"
              />
              <Wide
                label={copy.use}
                tone="ink"
                busy={busy}
                disabled={busy}
                onPress={() => void send(photo.shot)}
                testID="selfie-use"
              />
            </View>
          </View>
        </View>
      </View>
    );
  }

  // The hook answers undefined before it has read the status, not just null.
  const refused = !!permission && !permission.granted && !permission.canAskAgain;
  const live = !!permission?.granted;
  const ovalW = width * OVAL.width;
  const ovalH = ovalW * OVAL.ratio;
  const cx = width / 2;
  const cy = height * OVAL.centreY;
  return (
    <View
      accessibilityViewIsModal
      accessibilityLabel={copy.title}
      style={{ flex: 1, backgroundColor: INK }}
      testID="selfie-camera"
    >
      {live ? (
        <CameraView
          ref={camera}
          facing={facing}
          mode="picture"
          onCameraReady={() => setReady(true)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      {/* The face guide: the frame dimmed around an oval with a dashed edge. */}
      <Svg
        pointerEvents="none"
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
        accessible={false}
      >
        <Path
          fill={DIM}
          fillRule="evenodd"
          d={`M0 0H${width}V${height}H0Z M${cx - ovalW / 2} ${cy}a${ovalW / 2} ${ovalH / 2} 0 1 0 ${ovalW} 0a${ovalW / 2} ${ovalH / 2} 0 1 0 ${-ovalW} 0Z`}
        />
        <Ellipse
          cx={cx}
          cy={cy}
          rx={ovalW / 2}
          ry={ovalH / 2}
          fill="none"
          stroke={CREAM}
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
      </Svg>
      {/* Never a blank viewfinder: a line while the camera opens, the way to Settings if refused. */}
      {!live || !ready ? (
        <View
          pointerEvents="box-none"
          className="absolute inset-0 items-center justify-center gap-4 p-6"
        >
          <Text
            {...(refused ? { accessibilityRole: 'alert' as const } : {})}
            maxFontSizeMultiplier={maxFontSizeMultiplier.heading}
            style={{ fontFamily: fonts.displayItalic, fontSize: 20, color: CREAM }}
            className="text-center"
          >
            {refused ? cam.unreachable : cam.waiting}
          </Text>
          {refused || (permission && !permission.granted) ? (
            <Wide
              label={cam.allow}
              tone="light"
              onPress={() => (refused ? void Linking.openSettings() : void requestPermission())}
            />
          ) : null}
        </View>
      ) : null}
      <View
        pointerEvents="box-none"
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
        className="justify-between px-5 pt-2 pb-4"
      >
        <Round icon="close" label={copy.close} onPress={close} testID="selfie-close" />
        <View pointerEvents="box-none" className="items-center gap-6">
          <Pill text={copy.hint} />
          <View className="w-full flex-row items-center justify-between px-3">
            <Round
              icon="image"
              label={copy.photos}
              size={48}
              onPress={() => void library()}
              testID="selfie-photos"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.shutter}
              accessibilityState={{ disabled: !live || !ready }}
              disabled={!live || !ready}
              onPress={() => void shoot()}
              testID="selfie-shutter"
              style={{ borderColor: CREAM, opacity: live ? 1 : 0.4 }}
              className="size-[76px] rounded-pill border-[3px] p-1"
            >
              <View style={{ backgroundColor: CREAM }} className="flex-1 rounded-pill" />
            </Pressable>
            <Round
              icon="refresh"
              label={copy.flip}
              size={48}
              disabled={!live}
              onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
              testID="selfie-flip"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

// A light disc on the dark frame: close, her photos, the camera's turn.
function Round({
  icon,
  label,
  onPress,
  size = MIN_TOUCH,
  disabled = false,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={Math.max(0, (MIN_TOUCH - size) / 2)}
      testID={testID}
      style={{ width: size, height: size, backgroundColor: CREAM, opacity: disabled ? 0.5 : 1 }}
      className="items-center justify-center rounded-pill"
    >
      <Icon name={icon} size={20} color={INK} />
    </Pressable>
  );
}

// One line on glass over the frame: the hint, the review's note, or what went wrong.
function Pill({ text, alert = false }: { text: string; alert?: boolean }) {
  return (
    <View
      {...(alert ? { accessibilityRole: 'alert' as const } : {})}
      accessibilityLiveRegion="polite"
      style={{ backgroundColor: VEIL }}
      className="self-center rounded-pill px-4 py-2.5"
    >
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        style={{ fontFamily: fonts.sans, fontSize: 14, color: CREAM }}
        className="text-center"
      >
        {text}
      </Text>
    </View>
  );
}

// The review's two choices, side by side in thumb reach (design 05).
function Wide({
  label,
  tone,
  onPress,
  disabled = false,
  busy = false,
  testID,
}: {
  label: string;
  tone: 'light' | 'ink';
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
}) {
  const ink = tone === 'ink';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={{
        minHeight: 48,
        backgroundColor: ink ? INK : CREAM,
        opacity: disabled && !busy ? 0.6 : 1,
      }}
      className="flex-1 items-center justify-center rounded-pill px-5"
    >
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        style={{ ...LABEL, color: ink ? CREAM : INK, opacity: busy ? 0.6 : 1 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
