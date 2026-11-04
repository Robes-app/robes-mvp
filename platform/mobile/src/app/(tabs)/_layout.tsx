import { nav } from '@robes/copy';
import type { TAB_ICONS } from '@robes/icons';
import { fonts, useColor } from '@robes/ui-native';
import { Redirect, usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import type { ImageSourcePropType } from 'react-native';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AnalyticsSetup } from '@/lib/analytics';
import { LocationSetup } from '@/lib/location';
import { useAuthGate } from '@/lib/use-auth-gate';
import { PushSetup } from '@/lib/use-push';

type TabIcon = (typeof TAB_ICONS)[number];

// The @robes/icons glyphs as template images (pnpm --filter @robes/icons gen:tab-images): the
// system tints them, so state never needs a second drawing.
const ICON_SOURCES: Record<TabIcon, ImageSourcePropType> = {
  home: require('../../../assets/tabs/home.png'),
  book: require('../../../assets/tabs/book.png'),
  plan: require('../../../assets/tabs/plan.png'),
  wardrobe: require('../../../assets/tabs/wardrobe.png'),
};

const TABS: readonly { name: string; title: string; icon: TabIcon; testID: string }[] = [
  { name: 'index', title: nav.today, icon: 'home', testID: 'today-tab' },
  { name: 'looks', title: nav.looks, icon: 'book', testID: 'looks-tab' },
  { name: 'plan', title: nav.plan, icon: 'plan', testID: 'plan-tab' },
  { name: 'wardrobe', title: nav.wardrobe, icon: 'wardrobe', testID: 'wardrobe-tab' },
];

// The grids minimise the bar as she scrolls down; every other tab keeps it whole.
const MINIMISES = new Set(['/looks', '/wardrobe']);

// Home · Lookbook · Diary · Wardrobe in the system's own tab bar: Liquid Glass, minimise on scroll,
// Dynamic Type, the Large Content Viewer and VoiceOver's "tab, 1 of 4" all come from iOS (iOS
// navigation redline, 2026-11-04). No sparkle beside it: dressing starts from home's composer.
// The web twin is the phone dock in app/src/components/shell/app-shell.tsx.
export default function TabsLayout() {
  const gate = useAuthGate();
  const pathname = usePathname();
  const ink = useColor('ink');
  const muted = useColor('ink-muted');

  if (gate.state === 'loading') return <LoadingScreen />;
  if (gate.state === 'signed-out') return <Redirect href="/sign-in" />;
  if (gate.state === 'onboarding') return <Redirect href="/onboarding" />;

  return (
    <>
      <PushSetup />
      <AnalyticsSetup />
      <LocationSetup />
      <NativeTabs
        tintColor={ink}
        iconColor={{ default: muted, selected: ink }}
        labelStyle={{
          default: { fontFamily: fonts.sansMedium, fontSize: 10, color: muted },
          selected: { fontFamily: fonts.sansMedium, fontSize: 10, color: ink },
        }}
        minimizeBehavior={MINIMISES.has(pathname) ? 'onScrollDown' : 'never'}
      >
        {TABS.map((tab) => (
          <NativeTabs.Trigger
            key={tab.name}
            name={tab.name}
            testID={tab.testID}
            // Authored in sentence case and read that way; the bar shows it in capitals.
            accessibilityLabel={tab.title}
          >
            <NativeTabs.Trigger.Icon src={ICON_SOURCES[tab.icon]} renderingMode="template" />
            <NativeTabs.Trigger.Label>
              {tab.title.toLocaleUpperCase('en-GB')}
            </NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    </>
  );
}
