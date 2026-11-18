import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import { auth as copy, you } from '@robes/copy';
import { signUpFirstName } from '@robes/core/auth';
import {
  Button,
  ErrorText,
  Eyebrow,
  Field,
  Heading,
  PrimaryScope,
  Text,
  WarmGround,
  Wordmark,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Unrecorded } from '@/components/Unrecorded';
import { authClient } from '@/lib/auth-client';
import { LEGAL_URLS } from '@/lib/config';
import { afterSignIn } from '@/lib/links';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign in and sign up are one email code (design "Sign in and sign up", 18 Nov); sign up also
// asks her first name, saved once the code is verified. iOS is the email code alone; Android
// offers Google beside it, as the web does. Web twin: app/src/app/auth/auth-form.tsx.
export function AuthScreen({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const api = useApiClient();
  const queryClient = useQueryClient();
  // The screen a link was opening when she had no session (SessionGate).
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [socialError, setSocialError] = useState(false);
  // The server says which providers it runs; until it answers (or if it can't), email only.
  const { data: providers } = useApi(
    'public.authProviders',
    {},
    {
      enabled: Platform.OS !== 'ios',
    },
  );
  const google = Platform.OS !== 'ios' && providers?.google === true;

  async function sendCode() {
    if (!EMAIL.test(email.trim())) return setError(copy.invalidEmail);
    setBusy(true);
    setError(null);
    const res = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: 'sign-in',
    });
    setBusy(false);
    if (res.error) return setError(copy.sendFailed);
    setStep('code');
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.emailOtp({ email: email.trim(), otp: code.trim() });
    if (res.error) {
      setBusy(false);
      return setError(copy.invalidCode);
    }
    if (mode === 'sign-up' && name.trim()) {
      try {
        const me = await api.call('me.get');
        const firstName = signUpFirstName(name, me.firstName);
        if (firstName) {
          await api.call('me.update', { input: { firstName } });
          await queryClient.invalidateQueries({ queryKey: queryKeys.route('me.get') });
        }
      } catch {
        // She is signed in either way; onboarding's name step is still ahead of her.
      }
    }
    setBusy(false);
    // On to the screen a link was opening (audit F6), or Home.
    router.replace(afterSignIn(next) as never);
  }

  // Better Auth's Expo client opens the provider in an auth session and keeps the session in
  // SecureStore; a cancelled sheet resolves without a session and leaves her here.
  async function signInWithGoogle() {
    setSocialError(false);
    const res = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
    if (res.error) return setSocialError(true);
    const session = await authClient.getSession();
    if (session.data) router.replace(afterSignIn(next) as never);
  }

  function changeEmail() {
    setStep('email');
    setCode('');
    setError(null);
  }

  function switchMode() {
    const pathname = mode === 'sign-in' ? '/sign-up' : '/sign-in';
    router.replace((next ? { pathname, params: { next } } : pathname) as never);
  }

  return (
    <PrimaryScope>
      <View className="flex-1 bg-bg">
        <WarmGround />
        {/* A scroll, its form at the foot while it fits: on a small iPhone with the keyboard up,
            the legal line and the links scroll into reach instead of standing under it (audit,
            native: keyboard). The safe area is padding, never iOS's automatic content inset: that
            inset sits outside a `grow` container, so the screen opened taller than itself and the
            legal line and its links stood under the fold (Annie, 18 Nov). */}
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          contentContainerClassName="grow justify-between gap-10 px-6"
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
          <Wordmark />
          {step === 'email' ? (
            <View className="gap-7">
              <View className="gap-3">
                <Heading size="xl" accessibilityRole="header">
                  {mode === 'sign-in' ? copy.title : copy.signUpTitle}
                </Heading>
                <Text italic tone="muted">
                  {copy.subtitle}
                </Text>
              </View>
              <View className="gap-4">
                <Unrecorded>
                  <Field
                    label={copy.emailLabel}
                    placeholder={copy.emailPlaceholder}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    value={email}
                    onChangeText={setEmail}
                    onSubmitEditing={mode === 'sign-in' ? sendCode : undefined}
                    error={error}
                  />
                </Unrecorded>
                {mode === 'sign-up' ? (
                  <Field
                    label={copy.firstNameLabel}
                    placeholder={copy.firstNamePlaceholder}
                    autoComplete="given-name"
                    textContentType="givenName"
                    autoCapitalize="words"
                    value={name}
                    onChangeText={setName}
                    onSubmitEditing={sendCode}
                  />
                ) : null}
                <Button onPress={sendCode} loading={busy} loadingLabel={copy.sendingCode}>
                  {copy.sendCode}
                </Button>
              </View>
              {google ? (
                <View className="gap-3">
                  <Eyebrow className="text-center">{copy.or}</Eyebrow>
                  <Button variant="outline" onPress={signInWithGoogle}>
                    {copy.google}
                  </Button>
                  {socialError ? <ErrorText size="small">{copy.socialFailed}</ErrorText> : null}
                </View>
              ) : null}
              <Text size="caption" tone="muted" className="text-center">
                {mode === 'sign-in' ? copy.legal.lead : copy.legal.signUpLead}{' '}
                <Text
                  size="caption"
                  accessibilityRole="link"
                  className="underline"
                  onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
                >
                  {you.legal.terms}
                </Text>{' '}
                {copy.legal.and}{' '}
                <Text
                  size="caption"
                  accessibilityRole="link"
                  className="underline"
                  onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
                >
                  {you.legal.privacyNotice}
                </Text>
                {copy.legal.end}
              </Text>
              <Text size="small" tone="muted" className="text-center">
                {mode === 'sign-in' ? copy.toSignUp.lead : copy.toSignIn.lead}{' '}
                <Text
                  size="small"
                  accessibilityRole="link"
                  className="underline"
                  onPress={switchMode}
                >
                  {mode === 'sign-in' ? copy.toSignUp.link : copy.toSignIn.link}
                </Text>
              </Text>
            </View>
          ) : (
            <View className="gap-7">
              <View className="gap-3">
                <Heading size="xl" accessibilityRole="header">
                  {copy.codeTitle}
                </Heading>
                <Unrecorded>
                  <Text italic tone="muted">
                    {copy.codeSubtitle(email.trim())}
                  </Text>
                </Unrecorded>
              </View>
              <View className="gap-4">
                <Unrecorded>
                  <Field
                    label={copy.codeLabel}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                    onSubmitEditing={verify}
                    error={error}
                  />
                </Unrecorded>
                <Button
                  onPress={verify}
                  disabled={code.length !== 6}
                  loading={busy}
                  loadingLabel={copy.verifying}
                >
                  {copy.verify}
                </Button>
              </View>
              <Text size="small" tone="muted" className="text-center">
                {copy.notArrived.lead}{' '}
                <Text
                  size="small"
                  accessibilityRole="link"
                  className="underline"
                  onPress={() => void sendCode()}
                >
                  {copy.notArrived.link}
                </Text>
                {copy.notArrived.end}
              </Text>
              <Text size="small" tone="muted" className="text-center">
                {copy.wrongEmail.lead}{' '}
                <Text
                  size="small"
                  accessibilityRole="link"
                  className="underline"
                  onPress={changeEmail}
                >
                  {copy.wrongEmail.link}
                </Text>
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </PrimaryScope>
  );
}
