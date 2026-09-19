import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DEFAULT_MAP_DELTA } from '@runner/shared';
import type { MicroTask, VacancyDetail } from '@runner/shared';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { TaskMap } from '@/components/TaskMap';
import { useNearbyTasks, useUserLocation } from '@/hooks/useNearbyTasks';
import { useRunnerAvailability } from '@/hooks/useRunnerAvailability';
import { useRunnerLocationTracking } from '@/hooks/useRunnerLocationTracking';
import { fetchVacancies } from '@/modules/jobs/api';
import { colors, spacing } from '@/theme';

export default function RunnerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isRunner, isOnline, loading: runnerLoading, updating, toggleOnline } = useRunnerAvailability();
  const { data: location } = useUserLocation();
  const { data: tasks = [], isLoading, refetch, isRefetching } = useNearbyTasks(
    location?.lat ?? null,
    location?.lng ?? null,
  );

  const { data: vacancies = [] } = useQuery({
    queryKey: ['vacancies-map'],
    queryFn: () => fetchVacancies({}),
  });

  const vacanciesWithLocation = vacancies.filter((v) => v.location?.lat && v.location?.lng);

  useRunnerLocationTracking(isRunner && isOnline);

  const [region, setRegion] = useState({
    latitude: location?.lat ?? 41.2995,
    longitude: location?.lng ?? 69.2401,
    ...DEFAULT_MAP_DELTA,
  });

  useEffect(() => {
    if (!location) return;
    setRegion((prev) => ({
      ...prev,
      latitude: location.lat,
      longitude: location.lng,
    }));
  }, [location]);

  const handleTaskPress = (task: MicroTask) => {
    router.push(`/runner/${task.id}`);
  };

  const handleVacancyPress = (vacancy: VacancyDetail) => {
    router.push(`/jobs/${vacancy.id}`);
  };

  return (
    <View style={styles.container}>
      <TaskMap
        region={region}
        tasks={tasks}
        vacancies={vacanciesWithLocation}
        onRegionChangeComplete={setRegion}
        onTaskPress={handleTaskPress}
        onVacancyPress={handleVacancyPress}
      />

      <View style={styles.overlay}>
        <Pressable
          style={[styles.onlineBtn, isOnline && styles.onlineBtnActive, updating && styles.disabled]}
          onPress={() => void toggleOnline()}
          disabled={updating || runnerLoading}
        >
          {updating || runnerLoading ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <Text style={styles.onlineText}>
              {isOnline ? t('runner.goOffline') : t('runner.goOnline')}
            </Text>
          )}
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            style={styles.taskList}
            onRefresh={refetch}
            refreshing={isRefetching}
            ListEmptyComponent={<Text style={styles.empty}>{t('runner.noTasks')}</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.taskCard} onPress={() => handleTaskPress(item)}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{item.title}</Text>
                  {item.urgency !== 'normal' && (
                    <Text style={styles.urgentBadge}>{t('runner.urgent')}</Text>
                  )}
                </View>
                <Text style={styles.taskPrice}>
                  {t('runner.price')}: {item.price_amount.toLocaleString()} UZS
                </Text>
                {isOnline && (
                  <Text style={styles.acceptHint}>{t('runner.acceptTask')} →</Text>
                )}
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '45%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  onlineBtn: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  onlineBtnActive: { backgroundColor: colors.success },
  onlineText: { fontWeight: '600', color: colors.text },
  taskList: { flexGrow: 0 },
  taskCard: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  urgentBadge: {
    backgroundColor: colors.runnerAccent,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  taskPrice: { marginTop: 4, color: colors.textSecondary, fontSize: 14 },
  acceptHint: { marginTop: spacing.xs, color: colors.primary, fontWeight: '600', fontSize: 13 },
  loader: { marginVertical: spacing.lg },
  empty: { textAlign: 'center', color: colors.textSecondary, paddingVertical: spacing.lg },
  disabled: { opacity: 0.6 },
});
