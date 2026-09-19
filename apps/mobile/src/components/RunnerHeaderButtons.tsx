import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@/theme';

export function RunnerHeaderButtons() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Pressable style={styles.btn} onPress={() => router.push('/runner/my-tasks')}>
        <Text style={styles.text}>{t('runner.myTasks')}</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={() => router.push('/runner/create')}>
        <Text style={styles.textPrimary}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.sm, gap: spacing.xs },
  btn: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  text: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  textPrimary: { color: colors.primary, fontWeight: '700', fontSize: 22, lineHeight: 24 },
});
