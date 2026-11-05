import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier, Sheet, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { useSelfie } from '@/features/you/use-selfie';

// The `Robes model` tag (plan 2026-11-05 §1.3, design 3a/3b) on a look whose picture stands on a
// Robes model: a quiet chip on the photograph. Tapped, it pulls up a sheet — never a navigation,
// so an undecided deck is never thrown away — with Capture Selfie (the camera) and Adjust Robes
// Model (her model page). Its own Pressable, so a tap never reaches the card under it. Web twin:
// app/src/components/looks/robes-model-badge.tsx.
export function RobesModelBadge({
  look,
  on = look?.onRobesModel ?? false,
}: {
  look?: Look;
  // An empty draft has no picture yet: the tag follows the stand she is about to be dressed on.
  on?: boolean;
}) {
  const router = useRouter();
  const selfie = useSelfie();
  const [open, setOpen] = useState(false);
  if (!on) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.deck.robesModelLabel}
        onPress={() => setOpen(true)}
        style={{ minHeight: MIN_TOUCH }}
        className="absolute top-3 right-3 justify-center rounded-pill border border-hairline bg-bg px-3.5"
        testID="robes-model-badge"
      >
        <RNText
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          className="text-[9.5px] text-ink uppercase"
          style={{ fontFamily: fonts.sans, letterSpacing: 1.5 }}
        >
          {copy.deck.robesModel}
        </RNText>
      </Pressable>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        eyebrow={copy.deck.twin.eyebrow}
        title={`${copy.deck.twin.title} ${copy.deck.twin.titleEm}`}
        testID="robes-model-sheet"
      >
        <View className="pb-6">
          <Row
            icon="camera"
            label={copy.deck.twin.capture}
            testID="robes-model-capture"
            disabled={selfie.busy}
            onPress={() => {
              setOpen(false);
              void selfie.start();
            }}
          />
          <Row
            icon="user"
            label={copy.deck.twin.adjust}
            last
            testID="robes-model-adjust"
            onPress={() => {
              setOpen(false);
              router.push('/you/model');
            }}
          />
        </View>
      </Sheet>
    </>
  );
}

// One 56pt row: the icon in a 40pt disc, the words, a chevron (as home's LogSheet).
function Row({
  icon,
  label,
  last = false,
  disabled = false,
  testID,
  onPress,
}: {
  icon: IconName;
  label: string;
  last?: boolean;
  disabled?: boolean;
  testID: string;
  onPress: () => void;
}) {
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      className={`min-h-14 flex-row items-center gap-3.5 border-hairline border-t px-1 ${last ? 'border-b' : ''}`}
    >
      <View className="size-10 items-center justify-center rounded-pill border border-rule-mid bg-surface">
        <Icon name={icon} size={17} color={ink} />
      </View>
      <RNText
        maxFontSizeMultiplier={maxFontSizeMultiplier.body}
        className="flex-1 text-ink"
        style={{ fontFamily: fonts.sans, fontSize: 13 }}
      >
        {label}
      </RNText>
      <Icon name="forward" size={15} color={faint} />
    </Pressable>
  );
}
