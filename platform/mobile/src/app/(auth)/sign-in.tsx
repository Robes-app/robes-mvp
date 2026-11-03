import { useApi } from '@robes/api-client/react';
import { auth as copy } from '@robes/copy';
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
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { authClient } from '@/lib/auth-client';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [socialError, setSocialError] = useState(false);
  // The server says which providers it runs; until it answers (or if it can't), email only.
  const { data: providers } = useApi('public.authProviders');

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
    router.replace('/');
  }

  // Better Auth's Expo client opens the provider in an auth session and keeps the session in
  // SecureStore; a cancelled sheet resolves without a session and leaves her here.
  async function social(provider: 'apple' | 'google') {
    setSocialError(false);
    const res = await authClient.signIn.social({ provider, callbackURL: '/' });
    if (res.error) return setSocialError(true);
    const session = await authClient.getSession();
    if (session.data) router.replace('/');
  }

  return (
    <PrimaryScope>
      <View className="flex-1 bg-bg">
        <WarmGround />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center gap-8 px-6"
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
              {/* Web twin: app/src/app/auth/sign-in/sign-in-form.tsx. */}
              <Text size="small" tone="muted" className="-mt-2 text-center">
                {copy.noPassword}
              </Text>
              {providers?.apple || providers?.google ? (
                <View className="gap-3">
                  <Eyebrow className="text-center">{copy.or}</Eyebrow>
                  {providers.apple ? (
                    <Button variant="secondary" onPress={() => social('apple')}>
                      {copy.apple}
                    </Button>
                  ) : null}
                  {providers.google ? (
                    <Button variant="secondary" onPress={() => social('google')}>
                      {copy.google}
                    </Button>
                  ) : null}
                  {socialError ? <ErrorText size="small">{copy.socialFailed}</ErrorText> : null}
                </View>
              ) : null}
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
        </KeyboardAvoidingView>
      </View>
    </PrimaryScope>
  );
}
