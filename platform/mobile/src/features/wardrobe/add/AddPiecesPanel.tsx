import { wardrobe } from '@robes/copy';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import { MIN_TOUCH, SegmentedControl, Text, useColor, useToast } from '@robes/ui-native';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { type AddDestination, pickFromRoll, reviewHref } from './flow';

const copy = wardrobe.add;

// The Add pieces sheet's body (design "Add Piece — Handoff", 3a): where the pieces go, chosen
// once and carried through every path; the camera and the camera roll as the two large targets;
// a link, a receipt and the piece by hand as rows. The Create modal draws the same body.
// Web twin: components/wardrobe/add/add-pieces-panel.tsx.
export function AddPiecesPanel({ initial = 'wardrobe' }: { initial?: AddDestination }) {
  const router = useRouter();
  const toast = useToast();
  const [to, setTo] = useState<AddDestination>(initial);
  const [busy, setBusy] = useState(false);
  const go = (href: Href) => router.replace(href);

  async function roll() {
    setBusy(true);
    try {
      const shots = await pickFromRoll();
      if (shots === 'denied') toast.show({ message: wardrobe.photosDenied });
      else if (shots?.length) go(reviewHref({ to, shots, from: 'roll' }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-5">
      <SegmentedControl<AddDestination>
        label={copy.destination}
        value={to}
        onChange={setTo}
        options={[
          { value: 'wardrobe', label: copy.to.wardrobe },
          { value: 'wishlist', label: copy.to.wishlist },
        ]}
      />
      <View className="flex-row gap-3">
        <Tile
          icon="camera"
          label={copy.doors.photograph}
          disabled={busy}
          onPress={() => go({ pathname: '/wardrobe/camera', params: { to } })}
        />
        <Tile icon="image" label={copy.doors.cameraRoll} disabled={busy} onPress={roll} />
      </View>
      <View>
        <Door
          icon="link"
          label={copy.doors.link}
          onPress={() => go({ pathname: '/wardrobe/link', params: { to } })}
        />
        <Door icon="mail" label={copy.doors.receipt} onPress={() => go('/wardrobe/receipt')} />
        <Door
          icon="pencil"
          label={copy.doors.manual}
          onPress={() => go({ pathname: '/wardrobe/manual', params: { to } })}
        />
      </View>
    </View>
  );
}

function Tile({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const ink = useColor('ink');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`flex-1 items-center justify-center gap-3 rounded-soft border border-hairline bg-surface py-7 ${disabled ? 'opacity-50' : ''}`}
    >
      <Icon name={icon} size={28} color={ink} />
      <Text>{label}</Text>
    </Pressable>
  );
}

function Door({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ minHeight: MIN_TOUCH }}
      className="flex-row items-center gap-4 border-hairline border-b py-4"
    >
      <Icon name={icon} color={ink} />
      <Text className="flex-1">{label}</Text>
      <Icon name="forward" size={15} color={faint} />
    </Pressable>
  );
}
