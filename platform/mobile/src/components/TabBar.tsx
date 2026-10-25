import { nav, shell } from '@robes/copy';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier, useColor } from '@robes/ui-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

const BAR_HEIGHT = 64;
const SHADOW = {
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.1,
  shadowRadius: 15,
  elevation: 6,
} as const;

export const TAB_ICONS: Record<string, IconName> = {
  index: 'today',
  looks: 'book',
  plan: 'plan',
  wardrobe: 'wardrobe',
};

// iOS 26 draws real liquid glass; elsewhere the same frosted pill is a solid page-coloured float.
function Float({ children, round }: { children: ReactNode; round?: boolean }) {
  const ink = useColor('ink');
  const shape = round
    ? { width: BAR_HEIGHT, height: BAR_HEIGHT }
    : { flexGrow: 1, height: BAR_HEIGHT, paddingHorizontal: 6 };
  const style = { ...shape, borderRadius: 999, shadowColor: ink, ...SHADOW };
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" style={style} className="border border-hairline">
        {children}
      </GlassView>
    );
  }
  return (
    <View style={style} className="border border-hairline bg-bg">
      {children}
    </View>
  );
}

// Beta's dock, native-shaped: a floating bar of four destinations and, beside it, the sparkle
// that opens Create. Active: ink on a sunk pill; the rest ink-muted (Native parity handoff).
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={shell.primaryNav}
      className="flex-row items-center gap-[10px] bg-bg px-[14px] pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <Float>
        <View className="flex-1 flex-row items-center justify-between">
          {state.routes.map((route, index) => {
            const icon = TAB_ICONS[route.name];
            if (!icon) return null;
            const options = descriptors[route.key]?.options;
            const focused = state.index === index;
            const label = typeof options?.title === 'string' ? options.title : route.name;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: focused }}
                testID={options?.tabBarButtonTestID}
                onPress={() => {
                  const event = emitter.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    Haptics.selectionAsync().catch(() => {});
                    navigateToTab(route.key);
                  }
                }}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                style={{ height: 52, minWidth: MIN_TOUCH }}
                className={`flex-1 items-center justify-center gap-[3px] rounded-pill ${focused ? 'bg-surface-sunk' : ''}`}
              >
                <Icon name={icon} size={20} color={focused ? ink : muted} />
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={maxFontSizeMultiplier.label}
                  className={focused ? 'text-ink' : 'text-ink-muted'}
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: 9,
                    letterSpacing: 1.26,
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Float>
      <CreateButton />
    </View>
  );
}

function CreateButton() {
  const router = useRouter();
  const ink = useColor('ink');
  return (
    <Float round>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nav.create}
        testID="create-tab"
        onPress={() => router.push('/create')}
        // A long press goes straight to the camera.
        onLongPress={() => router.push({ pathname: '/create', params: { start: 'camera' } })}
        className="flex-1 items-center justify-center rounded-pill"
      >
        <Icon name="looks" size={22} color={ink} />
      </Pressable>
    </Float>
  );
}
