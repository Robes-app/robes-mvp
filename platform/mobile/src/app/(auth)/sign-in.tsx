import { useApi } from '@robes/api-client/react';
import { auth as copy, you } from '@robes/copy';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { authClient } from '@/lib/auth-client';
import { LEGAL_URLS } from '@/lib/config';
import { afterSignIn } from '@/lib/links';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const router = useRouter();
  // The screen a link was opening when she had no session (SessionGate).
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [socialError, setSocialError] = useState(false);
  // The server says which providers it runs; until it answers (or if it can't), email only.
  const { data: providers } = useApi('public.authProviders');
  // App Store 4.8: an iPhone offers Google only beside Sign in with Apple.
  const apple = providers?.apple === true;
  const google = providers?.google === true && (apple || Platform.OS !== 'ios');

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
    setBusy(false);
    if (res.error) return setError(copy.invalidCode);
    // On to the screen a link was opening (audit F6), or Home.
    router.replace(afterSignIn(next) as never);
  }

  // Better Auth's Expo client opens the provider in an auth session and keeps the session in
  // SecureStore; a cancelled sheet resolves without a session and leaves her here.
  async function social(provider: 'apple' | 'google') {
    setSocialError(false);
    const res = await authClient.signIn.social({ provider, callbackURL: '/' });
    if (res.error) return setSocialError(true);
    const session = await authClient.getSession();
    if (session.data) router.replace(afterSignIn(next) as never);
  }

  return (
    <PrimaryScope>
      <View className="flex-1 bg-bg">
        <WarmGround />
        {/* A scroll, centred while it fits: on a small iPhone with the keyboard up, the legal
            line and the Apple and Google buttons scroll into reach instead of standing under it
            (audit, native: keyboard). */}
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="grow justify-center gap-8 px-6 py-10"
        >
          {step === 'email' ? (
            <>
              <View className="gap-2">
                <Wordmark />
                <Heading size="xl">{copy.title}</Heading>
                <Text tone="muted">{copy.subtitle}</Text>
              </View>
              <Field
                label={copy.emailLabel}
                placeholder={copy.emailPlaceholder}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={sendCode}
                error={error}
              />
              <Button onPress={sendCode} loading={busy} loadingLabel={copy.sendingCode}>
                {copy.sendCode}
              </Button>
              {apple || google ? (
                <View className="gap-3">
                  <Eyebrow className="text-center">{copy.or}</Eyebrow>
                  {apple ? (
                    <Button variant="outline" onPress={() => social('apple')}>
                      {copy.apple}
                    </Button>
                  ) : null}
                  {google ? (
                    <Button variant="outline" onPress={() => social('google')}>
                      {copy.google}
                    </Button>
                  ) : null}
                  {socialError ? <ErrorText size="small">{copy.socialFailed}</ErrorText> : null}
                </View>
              ) : null}
              <Text size="caption" tone="faint" className="text-center">
                {copy.legal.lead}{' '}
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
            </>
          ) : (
            <>
              <View className="gap-2">
                <Heading>{copy.codeTitle}</Heading>
                <Text tone="muted">{copy.codeSubtitle(email.trim())}</Text>
              </View>
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
              <Button
                onPress={verify}
                disabled={code.length !== 6}
                loading={busy}
                loadingLabel={copy.verifying}
              >
                {copy.verify}
              </Button>
              <View className="flex-row justify-between">
                <Button variant="quiet" onPress={sendCode}>
                  {copy.resend}
                </Button>
                <Button
                  variant="quiet"
                  onPress={() => {
                    setStep('email');
                    setCode('');
                    setError(null);
                  }}
                >
                  {copy.useDifferentEmail}
                </Button>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </PrimaryScope>
  );
}
