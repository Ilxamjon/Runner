import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@/theme';

export function EmployerHeaderButton() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      style={styles.btn}
      onPress={() => router.push('/jobs/employer')}
    >
      <Text style={styles.text}>{t('jobs.myVacancies')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginRight: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  text: { color: colors.primary, fontWeight: '600', fontSize: 14 },
});
