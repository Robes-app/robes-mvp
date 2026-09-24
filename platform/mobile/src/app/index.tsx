import { useApi } from '@robes/api-client/react';
import type { Me } from '@robes/contracts';
import { auth as authCopy, nav, today } from '@robes/copy';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { TextButton } from '@/components/form';
import { authClient } from '@/lib/auth-client';

export function TodayView({ me, onSignOut }: { me: Me; onSignOut: () => void }) {
  return (
    <View className="flex-1 justify-center gap-4 bg-bg px-6">
      <Text className="text-xs uppercase tracking-widest text-ink-muted">{nav.today}</Text>
      <Text className="text-5xl text-ink" style={{ fontFamily: 'Cormorant_300Light' }}>
        {today.greeting(me.firstName, new Date().getHours())}
      </Text>
      <Text className="text-ink-muted" style={{ fontFamily: 'Inter_400Regular' }}>
        {today.nextStep}
      </Text>
      <View className="mt-6">
        <TextButton onPress={onSignOut}>{authCopy.signOut}</TextButton>
      </View>
    </View>
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
