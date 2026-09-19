import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { isSupabaseConfigured } from '@/lib/supabase';
import { sendPhoneOtp, verifyPhoneOtp } from '@/modules/auth/api';
import { Button, Input, LoadingScreen } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function SignInScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();
  const [phone, setPhone] = useState('+998');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (authLoading) return <LoadingScreen />;
  if (session && profile?.onboarding_completed) return <Redirect href="/(tabs)" />;
  if (session) return <Redirect href="/onboarding" />;

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        setError(t('auth.notConfigured'));
        return;
      }
      await sendPhoneOtp(phone);
      setOtpSent(true);
      Alert.alert(t('auth.otpSent'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'INVALID_PHONE') setError(t('auth.invalidPhone'));
      else setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await verifyPhoneOtp(phone, otp);
      router.replace('/');
    } catch {
      setError(t('auth.invalidOtp'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>{t('auth.welcome')}</Text>
        <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

        <Input
          label={t('auth.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+998 90 123 45 67"
          editable={!otpSent}
          error={error && !otpSent ? error : undefined}
        />

        {otpSent && (
          <Input
            label={t('auth.enterOtp')}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            error={error && otpSent ? error : undefined}
          />
        )}

        <Button
          title={otpSent ? t('auth.verifyOtp') : t('auth.sendOtp')}
          onPress={otpSent ? handleVerifyOtp : handleSendOtp}
          loading={loading}
          disabled={otpSent ? otp.length < 4 : phone.length < 13}
        />

        {otpSent && (
          <Button
            title={t('auth.phone')}
            onPress={() => {
              setOtpSent(false);
              setOtp('');
              setError('');
            }}
            variant="outline"
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.xl },
});
