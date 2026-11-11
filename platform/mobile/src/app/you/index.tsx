import { you } from '@robes/copy';
import { SubviewHeader } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YouMenu } from '@/features/you/YouMenu';

// Settings stands on Felix's subview header (SettingsView), its title in the tabs' serif.
// Web twin: app/src/app/(app)/you/page.tsx (SettingsPage `subview`).
export default function YouMenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <SubviewHeader
        title={you.settings}
        serif
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <View className="flex-1">
        <YouMenu />
      </View>
    </View>
  );
}
