import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchMessages,
  markConversationRead,
  sendMessage,
  subscribeToMessages,
} from '@/modules/chat/api';
import { Button, LoadingScreen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => fetchMessages(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    void markConversationRead(id);
    const channel = subscribeToMessages(id, () => {
      void refetch();
      void markConversationRead(id);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => channel.unsubscribe();
  }, [id, refetch, queryClient]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!id || !text.trim()) return;
    setSending(true);
    try {
      await sendMessage(id, text);
      setText('');
      await refetch();
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } finally {
      setSending(false);
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('chat.noMessages')}</Text>}
        renderItem={({ item }) => {
          const mine = item.sender_id === session?.user.id;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              {!mine && (
                <Text style={styles.sender}>{item.sender?.full_name ?? ''}</Text>
              )}
              <Text style={[styles.body, mine && styles.bodyMine]}>{item.body}</Text>
              <Text style={[styles.time, mine && styles.timeMine]}>
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <Button
          title={t('chat.send')}
          onPress={() => void handleSend()}
          loading={sending}
          disabled={!text.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: spacing.sm },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
  bubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  sender: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  body: { fontSize: 15, color: colors.text, lineHeight: 20 },
  bodyMine: { color: '#fff' },
  time: { fontSize: 10, color: colors.textSecondary, marginTop: 4, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
});
