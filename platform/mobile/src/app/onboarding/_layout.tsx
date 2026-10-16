import { Redirect, Stack } from 'expo-router';
import { useRef } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuthGate } from '@/lib/use-auth-gate';

// Someone already onboarded who lands here (a deep link, a stale stack) goes home. Decided once
// on arrival: finishing onboarding mid-flow must not pull Composing out from under her.
export default function OnboardingLayout() {
  const gate = useAuthGate();
  const arrived = useRef<'onboarding' | 'onboarded' | null>(null);
  if (gate.state === 'loading' && arrived.current === null) return <LoadingScreen />;
  if (gate.state === 'signed-out') return <Redirect href="/sign-in" />;
  if (arrived.current === null)
    arrived.current = gate.state === 'ready' ? 'onboarded' : 'onboarding';
  if (arrived.current === 'onboarded') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
