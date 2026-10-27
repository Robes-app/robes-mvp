import { nav } from '@robes/copy';
import { Redirect, Tabs } from 'expo-router';
import { LoadingScreen } from '@/components/LoadingScreen';
import { TabBar } from '@/components/TabBar';
import { AnalyticsSetup } from '@/lib/analytics';
import { useAuthGate } from '@/lib/use-auth-gate';
import { PushSetup } from '@/lib/use-push';

// Today · Lookbook · Diary · Wardrobe, with Create as the sparkle beside the bar — beta's dock
// (Native parity handoff, 2026-10-25; supersedes the five-tab UX-11 order with [+] in the middle).
export default function TabsLayout() {
  const gate = useAuthGate();

  if (gate.state === 'loading') return <LoadingScreen />;
  if (gate.state === 'signed-out') return <Redirect href="/sign-in" />;
  if (gate.state === 'onboarding') return <Redirect href="/onboarding" />;

  return (
    <>
      <PushSetup />
      <AnalyticsSetup />
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="index" options={{ title: nav.today, tabBarButtonTestID: 'today-tab' }} />
        <Tabs.Screen name="looks" options={{ title: nav.looks, tabBarButtonTestID: 'looks-tab' }} />
        <Tabs.Screen name="plan" options={{ title: nav.plan, tabBarButtonTestID: 'plan-tab' }} />
        <Tabs.Screen
          name="wardrobe"
          options={{ title: nav.wardrobe, tabBarButtonTestID: 'wardrobe-tab' }}
        />
      </Tabs>
    </>
  );
}
