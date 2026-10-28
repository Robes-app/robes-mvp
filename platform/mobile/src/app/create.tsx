import { shell } from '@robes/copy';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import { Eyebrow, MIN_TOUCH, Text, useColor } from '@robes/ui-native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { FormSheetScreen } from '@/components/FormSheetScreen';
import { NewLookBox } from '@/features/home/HomeBox';
import { AddPiecesPanel } from '@/features/wardrobe/add/AddPiecesPanel';
import { useFeatures } from '@/lib/features';

type Option = { label: string; icon: IconName; href: Href; trips?: true };

// IA §3.2 Create sheet, a formSheet like Add pieces (app/_layout.tsx FORM_SHEET): pieces in (the
// Add pieces sheet's own body, so the two never drift), then the stylist: the new-look box first (Ask Robes), then the ways to start from a piece.
const DRESS: Option[] = [
  { label: shell.create.stylePiece, icon: 'looks', href: '/looks/style' },
  { label: shell.create.newLook, icon: 'plus', href: '/looks/new' },
  { label: shell.create.planTrip, icon: 'trip', href: '/trip/new', trips: true },
];

export default function Create() {
  const router = useRouter();
  const ink = useColor('ink');
  const { features } = useFeatures();
  const options = DRESS.filter((o) => !o.trips || features.trips);
  // A long press on the + tab lands here with the camera already asked for.
  const { start } = useLocalSearchParams<{ start?: string }>();
  const started = useRef(false);
  useEffect(() => {
    if (start === 'camera' && !started.current) {
      started.current = true;
      router.replace('/wardrobe/camera');
    }
  });

  return (
    <FormSheetScreen title={shell.create.title}>
      <ScrollView
        contentContainerClassName="gap-5 px-6 pt-3.5 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* Beta's sparkle opens the new-look box (legacy __rbHbOpen({fresh})): here it leads.
            The web twin leads the Create sheet in app/src/components/shell/app-shell.tsx. */}
        <NewLookBox />
        <View className="gap-3">
          <Eyebrow>{shell.create.groups.add}</Eyebrow>
          <AddPiecesPanel />
        </View>
        <View>
          <Eyebrow>{shell.create.groups.dress}</Eyebrow>
          {options.map((option) => (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              onPress={() => router.replace(option.href)}
              style={{ minHeight: MIN_TOUCH }}
              className="flex-row items-center gap-4 border-b border-hairline py-4"
            >
              <Icon name={option.icon} color={ink} />
              <Text>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </FormSheetScreen>
  );
}
