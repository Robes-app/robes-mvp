import { useApi } from '@robes/api-client/react';
import { firstRun as copy } from '@robes/copy';
import { dayMonth, weekdayShort } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import { Button, ErrorText, Text, useColor } from '@robes/ui-native';
import { Pressable, View } from 'react-native';
import { FirstRunFrame } from '@/features/home/FirstRunFrame';
import { QuietLink } from './CaptureStep';

// 08 Today's outfit (onboarding PRD R-8; design Q6): the intro, then Home's own Capture for today
// (`/looks/photo?day=`): the mirror camera, "Whole outfit in frame?", Find the pieces — where she
// keeps or strikes each one Robes reads — and Save, which puts the look on today and lands her on
// Home with it in place. The flow is finished as she goes there, so Home is hers when she lands.
export function OutfitStep({
  step,
  busy,
  error,
  onBack,
  onCapture,
  onSkip,
}: {
  step: number;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onCapture: (day: string) => void;
  onSkip: () => void;
}) {
  const today = useApi('today.get');
  const ink = useColor('ink');
  const date = today.data?.date ?? null;
  const capture = () => (date ? onCapture(date) : undefined);
  return (
    <FirstRunFrame
      step={step}
      title={copy.outfit.title}
      titleEm={copy.outfit.titleEm}
      onBack={onBack}
      footer={
        <>
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button
            variant="primary"
            disabled={!date}
            loading={busy}
            onPress={capture}
            testID="onboarding-capture"
          >
            {copy.outfit.capture}
          </Button>
          <QuietLink label={copy.skip} onPress={onSkip} testID="onboarding-skip" />
        </>
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.outfit.capture}
        disabled={!date || busy}
        onPress={capture}
        className="h-[380px] items-center justify-center gap-4 rounded-card border border-rule-mid bg-surface-raised"
      >
        <View className="size-14 items-center justify-center rounded-full border border-rule-mid bg-bg">
          <Icon name="camera" size={24} color={ink} />
        </View>
        {date ? (
          <Text size="small" tone="muted">
            {copy.outfit.today(`${weekdayShort(date)} ${dayMonth(date)}`)}
          </Text>
        ) : null}
      </Pressable>
    </FirstRunFrame>
  );
}
