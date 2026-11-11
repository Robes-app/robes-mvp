import { wardrobe } from '@robes/copy';
import type { AddDestination } from '@robes/core/add-flow';
import { Button, Em, Heading, PrimaryScope, Text } from '@robes/ui-native';
import { type Href, useRouter } from 'expo-router';
import { View } from 'react-native';
import { wardrobeHref } from './flow';

const copy = wardrobe.add;

// Filed (design 3a), after a piece added without a photo: how many, in words, one line on where
// they are, and the way on. Photographs and links end on the wardrobe itself under a toast
// (Capture PRD 3c.5). Web twin: components/wardrobe/add/filed.tsx.
export function Filed({ to, kept }: { to: AddDestination; kept: number }) {
  const router = useRouter();
  const go = (href: Href) => router.replace(href);
  return (
    <PrimaryScope>
      <View className="flex-1 justify-center gap-6 px-6 pb-16">
        <View className="gap-3">
          <Heading size="md" style={{ fontSize: 36 }}>
            {kept ? (
              <>
                {copy.filed.head(kept)} <Em>{copy.filed.wink}</Em>
              </>
            ) : (
              copy.filed.none
            )}
          </Heading>
          {kept ? (
            <Text tone="muted">
              {to === 'wishlist' ? copy.filed.line.wishlist(kept) : copy.filed.line.wardrobe}
            </Text>
          ) : null}
        </View>
        <View className="gap-3">
          <Button onPress={() => go(wardrobeHref(to))}>{copy.filed.see[to]}</Button>
          <Button
            variant="outline"
            onPress={() => go({ pathname: '/wardrobe/add', params: { to } })}
          >
            {copy.filed.another}
          </Button>
        </View>
      </View>
    </PrimaryScope>
  );
}
