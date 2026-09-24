import { useApi } from '@robes/api-client/react';
import { looks, nav, today } from '@robes/copy';
import { Button, Heading, PrimaryScope, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { TabScreen } from '@/components/TabScreen';

export default function Today() {
  const router = useRouter();
  const { data: me } = useApi('me.get');
  return (
    <TabScreen title={nav.today}>
      <PrimaryScope>
        <View className="flex-1 justify-center gap-4 px-6">
          <Heading size="xl">
            {today.greeting(me?.firstName ?? null, new Date().getHours())}
          </Heading>
          <Text tone="muted">{today.nextStep}</Text>
          <View className="mt-6 items-start">
            <Button icon="ask" onPress={() => router.push('/looks/style')}>
              {looks.stylePiece.eyebrow}
            </Button>
          </View>
        </View>
      </PrimaryScope>
    </TabScreen>
  );
}
