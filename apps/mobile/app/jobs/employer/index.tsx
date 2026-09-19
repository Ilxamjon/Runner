import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/AuthProvider';
import { useLocalizedName } from '@/hooks/useLocalizedName';
import { fetchEmployerVacancies } from '@/modules/jobs/api';
import { formatSalary } from '@/modules/jobs/utils';
import { Button, LoadingScreen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function EmployerVacanciesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const ln = useLocalizedName();

  const { data: vacancies = [], isLoading, refetch } = useQuery({
    queryKey: ['employer-vacancies', session?.user.id],
    queryFn: () => fetchEmployerVacancies(session!.user.id),
    enabled: !!session?.user.id,
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <Button
        title={t('jobs.createVacancy')}
        onPress={() => router.push('/jobs/employer/create')}
      />

      <FlatList
        data={vacancies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={<Text style={styles.empty}>{t('jobs.noResults')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/jobs/employer/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={[styles.badge, item.status === 'published' && styles.badgePublished]}>
                {t(`jobs.${item.status}`)}
              </Text>
            </View>
            <Text style={styles.meta}>
              {t(`jobs.${item.job_type}`)}
              {item.region ? ` · ${ln(item.region)}` : ''}
            </Text>
            <Text style={styles.salary}>{formatSalary(item)}</Text>
            <Pressable
              style={styles.applicantsBtn}
              onPress={() => router.push(`/jobs/employer/${item.id}/applicants`)}
            >
              <Text style={styles.applicantsText}>{t('jobs.applicants')} →</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  list: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 17, fontWeight: '600', color: colors.text, flex: 1 },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.border,
    color: colors.textSecondary,
    overflow: 'hidden',
  },
  badgePublished: { backgroundColor: '#DCFCE7', color: colors.success },
  meta: { marginTop: 4, color: colors.textSecondary, fontSize: 14 },
  salary: { marginTop: spacing.sm, color: colors.primary, fontWeight: '500' },
  applicantsBtn: { marginTop: spacing.sm },
  applicantsText: { color: colors.primary, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
});
