import { auth as copy } from '@robes/copy';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Field, PrimaryButton, TextButton } from '@/components/form';
import { authClient } from '@/lib/auth-client';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-center gap-8 bg-bg px-6"
    >
      {step === 'email' ? (
        <>
          <View className="gap-2">
            <Text className="text-xs uppercase tracking-widest text-ink-muted">{copy.eyebrow}</Text>
            <Text className="text-5xl text-ink" style={{ fontFamily: 'Cormorant_300Light' }}>
              {copy.title}
            </Text>
            <Text className="text-ink-muted">{copy.subtitle}</Text>
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
          <PrimaryButton onPress={sendCode} disabled={busy}>
            {busy ? copy.sendingCode : copy.sendCode}
          </PrimaryButton>
        </>
      ) : (
        <>
          <View className="gap-2">
            <Text className="text-4xl text-ink" style={{ fontFamily: 'Cormorant_300Light' }}>
              {copy.codeTitle}
            </Text>
            <Text className="text-ink-muted">{copy.codeSubtitle(email.trim())}</Text>
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
          <PrimaryButton onPress={verify} disabled={busy || code.length !== 6}>
            {busy ? copy.verifying : copy.verify}
          </PrimaryButton>
          <View className="flex-row justify-between">
            <TextButton onPress={sendCode}>{copy.resend}</TextButton>
            <TextButton
              onPress={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            >
              {copy.useDifferentEmail}
            </TextButton>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
