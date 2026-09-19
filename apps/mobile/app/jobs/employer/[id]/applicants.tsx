import { useEffect } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ApplicationStatus } from '@runner/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getOrCreateApplicationConversation } from '@/modules/chat/api';
import {
  APPLICATION_STATUSES,
  fetchVacancyApplications,
  subscribeToApplications,
  updateApplicationStatus,
} from '@/modules/jobs/api';
import { experienceLabel } from '@/modules/jobs/utils';
import { LoadingScreen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function ApplicantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ['applications', id],
    queryFn: () => fetchVacancyApplications(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    const channel = subscribeToApplications(id, () => {
      void queryClient.invalidateQueries({ queryKey: ['applications', id] });
    });
    return () => {
      void supabaseRemoveChannel(channel);
    };
  }, [id, queryClient]);

  const handleStatusChange = (applicationId: string, status: ApplicationStatus) => {
    Alert.alert(t('jobs.updateStatus'), t(`jobs.status.${status}`), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.save'),
        onPress: async () => {
          await updateApplicationStatus(applicationId, status);
          await refetch();
        },
      },
    ]);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={applications}
      keyExtractor={(item) => item.id}
      onRefresh={refetch}
      refreshing={isLoading}
      ListEmptyComponent={<Text style={styles.empty}>{t('jobs.noApplicants')}</Text>}
      renderItem={({ item }) => {
        const candidate = item.candidate;
        const cp = candidate?.candidate_profiles;
        return (
          <View style={styles.card}>
            <Text style={styles.name}>{candidate?.full_name ?? '—'}</Text>
            {cp?.headline && <Text style={styles.headline}>{cp.headline}</Text>}
            {cp && (
              <Text style={styles.meta}>
                {experienceLabel(cp.experience_level, t)}
                {cp.skills.length > 0 ? ` · ${cp.skills.slice(0, 3).join(', ')}` : ''}
              </Text>
            )}
            {item.cover_letter && (
              <Text style={styles.letter} numberOfLines={3}>{item.cover_letter}</Text>
            )}
            <Text style={styles.status}>{t(`jobs.status.${item.status}`)}</Text>

            <Pressable
              style={styles.chatBtn}
              onPress={async () => {
                try {
                  const convId = await getOrCreateApplicationConversation(item.id);
                  router.push(`/chat/${convId}`);
                } catch {
                  Alert.alert(t('common.error'));
                }
              }}
            >
              <Text style={styles.chatText}>{t('chat.openChat')}</Text>
            </Pressable>

            <View style={styles.statusRow}>
              {APPLICATION_STATUSES.filter((s) => s !== item.status).map((status) => (
                <Pressable
                  key={status}
                  style={styles.statusChip}
                  onPress={() => handleStatusChange(item.id, status)}
                >
                  <Text style={styles.statusChipText}>{t(`jobs.status.${status}`)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      }}
    />
  );
}

function supabaseRemoveChannel(channel: ReturnType<typeof subscribeToApplications>) {
  channel.unsubscribe();
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
  name: { fontSize: 17, fontWeight: '600', color: colors.text },
  headline: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  letter: { fontSize: 14, color: colors.text, marginTop: spacing.sm, fontStyle: 'italic' },
  status: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  chatBtn: { marginTop: spacing.sm },
  chatText: { color: colors.primary, fontWeight: '600' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipText: { fontSize: 11, color: colors.textSecondary },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
});
