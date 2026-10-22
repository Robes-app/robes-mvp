import { photoPieces, shell } from '@robes/copy';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import { Eyebrow, MIN_TOUCH, Text, useColor, useToast } from '@robes/ui-native';
import { type Href, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { StackScreen } from '@/components/StackScreen';
import { type AddSource, useAddPieces } from '@/features/wardrobe/add-pieces';
import { useFeatures } from '@/lib/features';

type Option = { label: string; icon: IconName; group: 'add' | 'dress'; trips?: true } & (
  | { add: AddSource }
  | { href: Href }
);

// IA §3.2 Create sheet, grouped: pieces in, then the stylist (the sparkle, never a chat
// bubble). Options not built yet lead to the shared "On its way" screen.
const OPTIONS: Option[] = [
  { label: shell.create.photograph, icon: 'camera', group: 'add', add: 'camera' },
  { label: shell.create.cameraRoll, icon: 'image', group: 'add', add: 'library' },
  { label: photoPieces.door.title, icon: 'camera', group: 'add', href: '/wardrobe/pieces' },
  { label: shell.create.link, icon: 'link', group: 'add', href: '/wardrobe/link' },
  { label: shell.create.receipt, icon: 'mail', group: 'add', href: '/soon' },
  { label: shell.create.stylePiece, icon: 'looks', group: 'dress', href: '/looks/style' },
  { label: shell.create.newLook, icon: 'plus', group: 'dress', href: '/looks/new' },
  { label: shell.create.askRobes, icon: 'looks', group: 'dress', href: '/soon' },
  { label: shell.create.planTrip, icon: 'trip', group: 'dress', href: '/trip/new', trips: true },
];
const GROUPS = ['add', 'dress'] as const;

export default function Create() {
  const router = useRouter();
  const toast = useToast();
  const ink = useColor('ink');
  const { add, busy } = useAddPieces();
  const { features } = useFeatures();
  const options = OPTIONS.filter((o) => !o.trips || features.trips);

  async function choose(option: Option) {
    if ('href' in option) {
      router.replace(option.href);
      return;
    }
    const result = await add(option.add);
    if (result.status === 'cancelled') return;
    if (result.status === 'added') {
      // One photo gets its reveal; a batch files quietly and reads on the grid.
      const [one, more] = result.ids;
      router.replace(one && !more ? `/piece/${one}?saw=1` : '/wardrobe');
      return;
    }
    toast.show({ message: result.message });
  }

  return (
    <StackScreen title={shell.create.title} close>
      <ScrollView contentContainerClassName="gap-5 px-6 pb-8">
        {GROUPS.map((group) => (
          <View key={group}>
            <Eyebrow>{shell.create.groups[group]}</Eyebrow>
            {options
              .filter((option) => option.group === group)
              .map((option) => (
                <Pressable
                  key={option.label}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  disabled={busy}
                  onPress={() => choose(option)}
                  style={{ minHeight: MIN_TOUCH }}
                  className="flex-row items-center gap-4 border-b border-hairline py-4"
                >
                  <Icon name={option.icon} color={ink} />
                  <Text>{option.label}</Text>
                </Pressable>
              ))}
          </View>
        ))}
        {busy ? (
          <View className="items-center py-6">
            <ActivityIndicator color={ink} />
          </View>
        ) : null}
      </ScrollView>
    </StackScreen>
  );
}
