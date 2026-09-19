import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Input, LoadingScreen } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/providers/AuthProvider';
import { completeOnboarding } from '@/modules/profile/api';
import { colors, spacing } from '@/theme';

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { locale } = useLocale();
  const { session, refreshProfile, loading: authLoading, profile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (authLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/auth/sign-in" />;
  if (profile?.onboarding_completed) return <Redirect href="/(tabs)" />;

  const handleFinish = async () => {
    if (!session?.user.id) return;
    if (!fullName.trim()) {
      setError(t('onboarding.nameRequired'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      await completeOnboarding(
        session.user.id,
        { fullName, bio },
        locale,
      );
      await refreshProfile();
      router.replace('/');
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('onboarding.title')}</Text>
      <Text style={styles.step}>{t('onboarding.step1')}</Text>

      <Input
        label={t('onboarding.fullName')}
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
      <Input
        label={t('onboarding.bio')}
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={3}
        style={styles.textArea}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title={t('onboarding.finish')} onPress={() => void handleFinish()} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  step: { fontSize: 15, color: colors.textSecondary, marginBottom: spacing.lg },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
});
