import { useApiClient } from '@robes/api-client/react';
import { firstRun as copy, lookbook } from '@robes/copy';
import { dayMonth, weekdayShort } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import { palette } from '@robes/tokens';
import { Button, ErrorText, fonts, maxFontSizeMultiplier, useColor } from '@robes/ui-native';
import { useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { CaptureCamera } from '@/features/capture/CaptureCamera';
import { FirstRunFrame } from '@/features/home/FirstRunFrame';
import { useInvalidateLooks } from '@/features/looks/look-states';
import { localDate } from '@/features/looks/saved-looks';
import { type PickedPhoto, uploadPhoto } from '@/features/wardrobe/add-pieces';
import { QuietLink } from './CaptureStep';

// 08 Today's outfit (onboarding PRD R-8; design Q6): the intro, then Home's capture camera (the
// mirror, "Whole outfit in frame?"). Use photo saves it as a look, its picture her photograph, on
// today — no draft drawer (Annie, 17 Nov) — and she lands on Home with it as the day's card. She
// finds its pieces later, when she opens it.
export function OutfitStep({
  step,
  busy,
  error,
  onBack,
  onSaved,
  onSkip,
  today = localDate(),
}: {
  // Her calendar date on this phone, as the Diary's drawer reads it.
  today?: string;
  step: number;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onSaved: (day: string, lookId: string) => void;
  onSkip: () => void;
}) {
  const api = useApiClient();
  const refreshLooks = useInvalidateLooks();
  const ink = useColor('ink');
  const [camera, setCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const capture = () => {
    setFailed(null);
    setCamera(true);
  };

  // Her photograph → a saved look on today (Home's Capture saves the same look to the same day).
  async function use(photo: PickedPhoto) {
    if (saving) return;
    setSaving(true);
    setFailed(null);
    try {
      const photoAssetId = await uploadPhoto(api, photo, 'look_photo');
      const look = await api.call('looks.create', {
        input: { status: 'saved', pieces: [], photoAssetId },
      });
      await api.call('plan.pin', { params: { id: look.id }, input: { dates: [today] } });
      refreshLooks(look);
      onSaved(today, look.id);
    } catch {
      setFailed(lookbook.draftLook.capture.camera.failed);
      setSaving(false);
    }
  }

  if (camera) {
    return (
      <CaptureCamera
        copy={lookbook.draftLook.capture.camera}
        onUse={(photo) => void use(photo)}
        onClose={() => setCamera(false)}
        busy={saving || busy}
        error={failed ?? error}
      />
    );
  }

  return (
    <FirstRunFrame
      step={step}
      title={copy.outfit.title}
      titleEm={copy.outfit.titleEm}
      onBack={onBack}
      fill
      footer={
        <>
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button variant="primary" loading={busy} onPress={capture} testID="onboarding-capture">
            {copy.outfit.capture}
          </Button>
          <QuietLink label={copy.skip} onPress={onSkip} testID="onboarding-skip" />
        </>
      }
    >
      {/* Design Q6: a dashed warm card to the footer, a head-to-toe outline in it, the camera disc
          at its centre and today's date on a pill in its corner. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.outfit.capture}
        disabled={busy}
        onPress={capture}
        className="min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-card border border-selected-line border-dashed bg-selected"
      >
        <View
          accessible={false}
          className="absolute border border-selected-line border-dashed"
          style={{
            width: 150,
            height: '80%',
            maxHeight: 330,
            borderTopLeftRadius: 80,
            borderTopRightRadius: 80,
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
          }}
        />
        <View
          className="size-16 items-center justify-center rounded-full bg-surface-raised"
          style={{
            shadowColor: palette.ink,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 10,
            shadowOpacity: 0.18,
            elevation: 4,
          }}
        >
          <Icon name="camera" size={24} color={ink} />
        </View>
        <View className="absolute top-3.5 left-3.5 h-7 justify-center rounded-pill bg-surface-raised px-3">
          <RNText
            maxFontSizeMultiplier={maxFontSizeMultiplier.label}
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 9,
              letterSpacing: 9 * 0.22,
              textTransform: 'uppercase',
              color: ink,
            }}
          >
            {copy.outfit.today(`${weekdayShort(today)} ${dayMonth(today)}`)}
          </RNText>
        </View>
      </Pressable>
    </FirstRunFrame>
  );
}
