import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/AuthProvider';
import { fetchReviewsForUser } from '@/modules/trust/api';
import { LoadingScreen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function ReviewsScreen() {
  const { t } = useTranslation();
  const { session, profile } = useAuth();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', session?.user.id],
    queryFn: () => fetchReviewsForUser(session!.user.id),
    enabled: !!session?.user.id,
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.avg}>{Number(profile?.rating_avg ?? 0).toFixed(1)} ★</Text>
        <Text style={styles.count}>
          {profile?.rating_count ?? 0} {t('reviews.title').toLowerCase()}
        </Text>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('reviews.empty')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.name}>{item.reviewer?.full_name ?? '—'}</Text>
              <Text style={styles.stars}>{'★'.repeat(item.rating)}</Text>
            </View>
            {item.comment && <Text style={styles.comment}>{item.comment}</Text>}
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  summary: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avg: { fontSize: 36, fontWeight: '700', color: colors.runnerAccent },
  count: { color: colors.textSecondary, marginTop: 4 },
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '600', color: colors.text },
  stars: { color: colors.runnerAccent },
  comment: { marginTop: spacing.sm, color: colors.text, lineHeight: 20 },
  date: { marginTop: spacing.xs, fontSize: 12, color: colors.textSecondary },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
});
