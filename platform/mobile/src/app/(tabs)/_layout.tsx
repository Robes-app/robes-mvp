import { nav } from '@robes/copy';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import { useColor } from '@robes/ui-native';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuthGate } from '@/lib/use-auth-gate';

// Today · Wardrobe · [+] · Looks · Plan — the same names and order as the web nav (UX-11).
export default function TabsLayout() {
  const gate = useAuthGate();
  const router = useRouter();
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const bg = useColor('bg');
  const hairline = useColor('hairline');

  const icon =
    (name: IconName) =>
    ({ focused }: { focused: boolean }) => <Icon name={name} color={focused ? ink : muted} />;

  if (gate.state === 'loading') return <LoadingScreen />;
  if (gate.state === 'signed-out') return <Redirect href="/sign-in" />;
  if (gate.state === 'onboarding') return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ink,
        tabBarInactiveTintColor: muted,
        tabBarStyle: { backgroundColor: bg, borderTopColor: hairline },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: nav.today, tabBarIcon: icon('today'), tabBarButtonTestID: 'today-tab' }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: nav.wardrobe,
          tabBarIcon: icon('wardrobe'),
          tabBarButtonTestID: 'wardrobe-tab',
        }}
      />
      <Tabs.Screen
        // Not "create": that path belongs to the Create modal route.
        name="add"
        options={{ title: nav.create, tabBarIcon: icon('plus'), tabBarButtonTestID: 'create-tab' }}
        listeners={{
          tabPress: (event) => {
            // [+] opens the Create modal over whatever tab she's on.
            event.preventDefault();
            router.push('/create');
          },
        }}
      />
      <Tabs.Screen
        name="looks"
        options={{ title: nav.looks, tabBarIcon: icon('looks'), tabBarButtonTestID: 'looks-tab' }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: nav.plan, tabBarIcon: icon('plan'), tabBarButtonTestID: 'plan-tab' }}
      />
    </Tabs>
  );
}
