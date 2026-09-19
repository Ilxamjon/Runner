import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/AuthProvider';
import { fetchMyConversations, subscribeToConversationList } from '@/modules/chat/api';
import { LoadingScreen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function MessagesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations', session?.user.id],
    queryFn: () => fetchMyConversations(session!.user.id),
    enabled: !!session?.user.id,
  });

  useEffect(() => {
    if (!session?.user.id) return;
    const channel = subscribeToConversationList(session.user.id, () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => channel.unsubscribe();
  }, [session?.user.id, queryClient]);

  if (isLoading) return <LoadingScreen />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={conversations}
      keyExtractor={(item) => item.id}
      onRefresh={refetch}
      refreshing={isRefetching}
      ListEmptyComponent={<Text style={styles.empty}>{t('chat.empty')}</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.card, item.unread && styles.cardUnread]}
          onPress={() => router.push(`/chat/${item.id}`)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.other_user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.name}>{item.other_user?.full_name ?? '—'}</Text>
            {item.task_title && (
              <Text style={styles.task} numberOfLines={1}>{item.task_title}</Text>
            )}
            <Text style={styles.preview} numberOfLines={1}>
              {item.last_message?.body ?? t('chat.noMessages')}
            </Text>
          </View>
          {item.unread && <View style={styles.dot} />}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardUnread: { borderColor: colors.primaryLight, backgroundColor: '#F0FDFA' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  task: { fontSize: 12, color: colors.primary, marginTop: 2 },
  preview: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
});
