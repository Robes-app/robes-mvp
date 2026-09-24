import { useApi } from '@robes/api-client/react';
import type { Me } from '@robes/contracts';
import { auth as authCopy, nav, today } from '@robes/copy';
import { Button, Eyebrow, Heading, PrimaryScope, Text } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { authClient } from '@/lib/auth-client';

export function TodayView({ me, onSignOut }: { me: Me; onSignOut: () => void }) {
  return (
    <PrimaryScope>
      <View className="flex-1 justify-center gap-4 bg-bg px-6">
        <Eyebrow>{nav.today}</Eyebrow>
        <Heading size="xl">{today.greeting(me.firstName, new Date().getHours())}</Heading>
        <Text tone="muted">{today.nextStep}</Text>
        <View className="mt-6 items-start">
          <Button variant="quiet" onPress={onSignOut}>
            {authCopy.signOut}
          </Button>
        </View>
      </View>
    </PrimaryScope>
  );
}

export default function Home() {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const signedIn = Boolean(session.data);
  const { data: me } = useApi('me.get', undefined, { enabled: signedIn });

  if (session.isPending || (signedIn && !me)) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator />
      </View>
    );
  }
  if (!signedIn) return <Redirect href="/sign-in" />;
  if (me && !me.onboarded) return <Redirect href="/onboarding" />;
  return me ? (
    <TodayView
      me={me}
      onSignOut={async () => {
        await authClient.signOut();
        // Cached responses belong to the previous user.
        queryClient.clear();
      }}
    />
  ) : null;
}
