import { shell } from '@robes/copy';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import { MIN_TOUCH, Text, useColor, useToast } from '@robes/ui-native';
import { type Href, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { StackScreen } from '@/components/StackScreen';
import { type AddSource, useAddPieces } from '@/features/wardrobe/add-pieces';

type Option = { label: string; icon: IconName } & ({ add: AddSource } | { href: Href });

// IA §3.2 Create sheet; options not built yet lead to the shared "On its way" screen.
const OPTIONS: Option[] = [
  { label: shell.create.photograph, icon: 'camera', add: 'camera' },
  { label: shell.create.cameraRoll, icon: 'image', add: 'library' },
  { label: shell.create.stylePiece, icon: 'looks', href: '/looks/style' },
  { label: shell.create.link, icon: 'link', href: '/soon' },
  { label: shell.create.receipt, icon: 'mail', href: '/soon' },
  { label: shell.create.newLook, icon: 'plus', href: '/looks/new' },
  { label: shell.create.askRobes, icon: 'ask', href: '/soon' },
  { label: shell.create.planTrip, icon: 'trip', href: '/trip/new' },
];

export default function Create() {
  const router = useRouter();
  const toast = useToast();
  const ink = useColor('ink');
  const { add, busy } = useAddPieces();

  async function choose(option: Option) {
    if ('href' in option) {
      router.replace(option.href);
      return;
    }
    const result = await add(option.add);
    if (result.status === 'cancelled') return;
    if (result.status === 'added') {
      router.replace('/wardrobe');
      return;
    }
    toast.show({ message: result.message });
  }

  return (
    <StackScreen title={shell.create.title} close>
      <ScrollView contentContainerClassName="px-6 pb-8">
        {OPTIONS.map((option) => (
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
        {busy ? (
          <View className="items-center py-6">
            <ActivityIndicator color={ink} />
          </View>
        ) : null}
      </ScrollView>
    </StackScreen>
  );
}
