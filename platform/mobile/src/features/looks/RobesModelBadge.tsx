import { useApi } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import { appCaps, fonts, maxFontSizeMultiplier, Sheet, useColor } from '@robes/ui-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { useSelfie } from '@/features/you/use-selfie';

// The `Robes model` tag (plan 2026-11-05 §1.3, design 3a/3b; redlines 2026-11-05) on a saved
// look whose picture stands on a Robes model: a 28pt glass pill, top-right of the picture — a dot,
// the words, a chevron — in a 44pt hit area. Tapped, it pulls up the floating sheet — never a
// navigation, so an undecided deck is never thrown away — with Capture Selfie (the camera or her
// photos) and Adjust Robes Model (her model page, with her current model's thumbnail). Its own
// Pressable, so a tap never reaches the card under it. Web twin:
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
  const model = useApi('me.model.get', undefined, { enabled: on });
  const muted = useColor('ink-muted');
  const [open, setOpen] = useState(false);
  if (!on) return null;
  const thumb = model.data?.stand?.imageUrl ?? null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.deck.robesModelLabel}
        onPress={() => setOpen(true)}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        className="absolute top-3 right-3 h-7 flex-row items-center gap-2 rounded-pill bg-glass pr-2.5 pl-3"
        testID="robes-model-badge"
      >
        <View className="size-1.5 rounded-pill bg-ink-faint" />
        <RNText
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          className="text-ink uppercase"
          style={appCaps}
        >
          {copy.deck.robesModel}
        </RNText>
        <Icon name="forward" size={12} color={muted} />
      </Pressable>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        floating
        eyebrow={copy.deck.twin.eyebrow}
        eyebrowTone="warm"
        title={`${copy.deck.twin.title} ${copy.deck.twin.titleEm}`}
        testID="robes-model-sheet"
      >
        <View className="gap-2.5">
          <Row
            icon="selfie"
            label={copy.deck.twin.capture}
            edge="dashed"
            testID="robes-model-capture"
            disabled={selfie.busy}
            onPress={() => {
              setOpen(false);
              selfie.start();
            }}
          />
          <Row
            icon="user"
            thumb={thumb}
            label={copy.deck.twin.adjust}
            edge="hairline"
            testID="robes-model-adjust"
            onPress={() => {
              setOpen(false);
              router.push('/you/model');
            }}
          />
        </View>
      </Sheet>
      {selfie.chooser}
    </>
  );
}

// One of the sheet's two rows (redlines 2026-11-05): equal, boxed, transparent, the serif title;
// a dashed warm edge for the selfie, the firmer hairline for her model (its thumbnail leading).
function Row({
  icon,
  thumb = null,
  label,
  edge,
  disabled = false,
  testID,
  onPress,
}: {
  icon: IconName;
  thumb?: string | null;
  label: string;
  edge: 'dashed' | 'hairline';
  disabled?: boolean;
  testID: string;
  onPress: () => void;
}) {
  const muted = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      className={`min-h-[62px] flex-row items-center gap-3.5 rounded-soft px-4 py-3 ${
        edge === 'dashed' ? 'border-border-warm' : 'border-hairline-strong'
      }`}
      style={edge === 'dashed' ? { borderWidth: 1, borderStyle: 'dashed' } : { borderWidth: 0.5 }}
    >
      {thumb ? (
        <ExpoImage
          source={{ uri: thumb }}
          contentFit="cover"
          contentPosition={{ top: '12%', left: '50%' }}
          accessible={false}
          style={{ width: 20, height: 25, borderRadius: 2 }}
        />
      ) : (
        <Icon name={icon} size={20} color={muted} />
      )}
      <RNText
        maxFontSizeMultiplier={maxFontSizeMultiplier.body}
        className="flex-1 text-ink"
        style={{ fontFamily: fonts.displayRegular, fontSize: 18 }}
      >
        {label}
      </RNText>
      <Icon name="forward" size={16} color={muted} />
    </Pressable>
  );
}
