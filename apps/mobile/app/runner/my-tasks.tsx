import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { TaskStatus } from '@runner/shared';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/AuthProvider';
import { fetchMyEmployerTasks, fetchMyRunnerTasks } from '@/modules/runner/api';
import { LoadingScreen } from '@/components/ui';
import { colors, spacing } from '@/theme';

const STATUS_KEY: Record<TaskStatus, string> = {
  open: 'statusOpen',
  accepted: 'statusAccepted',
  in_progress: 'statusInProgress',
  completed: 'statusCompleted',
  verified: 'statusVerified',
  cancelled: 'statusCancelled',
  disputed: 'statusCancelled',
};

export default function MyTasksScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, profile } = useAuth();

  const isRunner = profile?.roles.includes('runner');
  const isEmployer = profile?.roles.includes('employer');

  const { data: runnerTasks = [], isLoading: loadingRunner } = useQuery({
    queryKey: ['my-runner-tasks', session?.user.id],
    queryFn: () => fetchMyRunnerTasks(session!.user.id),
    enabled: !!session?.user.id && isRunner,
  });

  const { data: employerTasks = [], isLoading: loadingEmployer } = useQuery({
    queryKey: ['my-employer-tasks', session?.user.id],
    queryFn: () => fetchMyEmployerTasks(session!.user.id),
    enabled: !!session?.user.id && isEmployer,
  });

  const tasks = [
    ...runnerTasks.map((t) => ({ ...t, role: 'runner' as const })),
    ...employerTasks
      .filter((et) => !['verified', 'cancelled'].includes(et.status))
      .map((t) => ({ ...t, role: 'employer' as const })),
  ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  if (loadingRunner || loadingEmployer) return <LoadingScreen />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={tasks}
      keyExtractor={(item) => `${item.role}-${item.id}`}
      ListEmptyComponent={<Text style={styles.empty}>{t('runner.noTasks')}</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/runner/${item.id}`)}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.price_amount.toLocaleString()} UZS · {t(`runner.${STATUS_KEY[item.status]}`)}
          </Text>
          <Text style={styles.role}>
            {item.role === 'runner' ? '🏃 Runner' : '🏢 ' + t('jobs.company')}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  meta: { marginTop: 4, color: colors.textSecondary, fontSize: 14 },
  role: { marginTop: spacing.sm, fontSize: 12, color: colors.primary },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
});
