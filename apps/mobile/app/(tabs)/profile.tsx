import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SUPPORTED_LOCALES } from '@runner/shared';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { locale, changeLocale } = useLocale();
  const { profile, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: () => void signOut().then(() => router.replace('/auth/sign-in')),
      },
    ]);
  };

  const menuItems = [
    {
      label: t('profile.resume'),
      onPress: () => router.push('/profile/resume'),
    },
    {
      label: t('profile.employerProfile'),
      onPress: () => router.push('/profile/employer'),
    },
    {
      label: t('jobs.myVacancies'),
      onPress: () => router.push('/jobs/employer'),
    },
    {
      label: t('jobs.createVacancy'),
      onPress: () => router.push('/jobs/employer/create'),
    },
    { label: t('profile.verifications'), onPress: () => router.push('/profile/verifications') },
    { label: t('reviews.title'), onPress: () => router.push('/profile/reviews') },
    { label: t('profile.wallet'), onPress: () => router.push('/profile/wallet') },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
        <Text style={styles.phone}>{profile?.phone ?? ''}</Text>
        {profile?.phone_verified && (
          <Text style={styles.verified}>✓ {t('profile.phoneVerified')}</Text>
        )}
        {(profile?.rating_count ?? 0) > 0 && (
          <Text style={styles.rating}>
            ★ {Number(profile?.rating_avg ?? 0).toFixed(1)} ({profile?.rating_count})
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
        <View style={styles.localeRow}>
          {SUPPORTED_LOCALES.map((code) => (
            <Pressable
              key={code}
              style={[styles.localeBtn, locale === code && styles.localeBtnActive]}
              onPress={() => void changeLocale(code)}
            >
              <Text style={[styles.localeText, locale === code && styles.localeTextActive]}>
                {code === 'uz' ? "O'zbek" : 'Русский'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.menu}>
        {menuItems.map((item) => (
          <Pressable key={item.label} style={styles.menuItem} onPress={item.onPress}>
            <Text style={styles.menuText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Button title={t('profile.logout')} onPress={handleLogout} variant="outline" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  phone: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  verified: { fontSize: 13, color: colors.success, marginTop: 4 },
  rating: { fontSize: 14, color: colors.runnerAccent, marginTop: 4, fontWeight: '600' },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  localeRow: { flexDirection: 'row', gap: spacing.sm },
  localeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  localeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  localeText: { color: colors.textSecondary, fontWeight: '500' },
  localeTextActive: { color: '#fff' },
  menu: { gap: spacing.sm, marginBottom: spacing.lg },
  menuItem: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuText: { fontSize: 16, color: colors.text },
});
