import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/AuthProvider';
import { useLocalizedName } from '@/hooks/useLocalizedName';
import { ReviewForm } from '@/components/ReviewForm';
import {
  calcNetPayout,
  calcPlatformFee,
  disputeEscrowForTask,
  fetchEscrowForTask,
  holdEscrowForTask,
  isInsufficientBalanceError,
  refundEscrowForTask,
  releaseEscrowForTask,
} from '@/modules/escrow/api';
import { getOrCreateTaskConversation } from '@/modules/chat/api';
import { fetchMyReviewForTask } from '@/modules/trust/api';
import {
  acceptTask,
  cancelTask,
  completeTask,
  fetchTaskById,
  getTaskImageUrl,
  startTask,
  subscribeToTask,
} from '@/modules/runner/api';
import { Button, Input, LoadingScreen } from '@/components/ui';
import { colors, spacing } from '@/theme';

const STATUS_LABELS: Record<string, string> = {
  open: 'statusOpen',
  accepted: 'statusAccepted',
  in_progress: 'statusInProgress',
  completed: 'statusCompleted',
  verified: 'statusVerified',
  cancelled: 'statusCancelled',
  disputed: 'statusDisputed',
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { session, profile } = useAuth();
  const ln = useLocalizedName();
  const queryClient = useQueryClient();
  const [acting, setActing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDispute, setShowDispute] = useState(false);

  const { data: task, isLoading, refetch } = useQuery({
    queryKey: ['task', id],
    queryFn: () => fetchTaskById(id!),
    enabled: !!id,
  });

  const { data: escrow, refetch: refetchEscrow } = useQuery({
    queryKey: ['escrow', id],
    queryFn: () => fetchEscrowForTask(id!),
    enabled: !!id,
  });

  const { data: myReview, refetch: refetchReview } = useQuery({
    queryKey: ['my-review', id, session?.user.id],
    queryFn: () => fetchMyReviewForTask(id!, session!.user.id),
    enabled: !!id && !!session?.user.id,
  });

  const [openingChat, setOpeningChat] = useState(false);

  useEffect(() => {
    if (!id) return;
    const channel = subscribeToTask(id, () => {
      void queryClient.invalidateQueries({ queryKey: ['task', id] });
      void queryClient.invalidateQueries({ queryKey: ['escrow', id] });
    });
    return () => channel.unsubscribe();
  }, [id, queryClient]);

  const isEmployer = task?.employer_id === session?.user.id;
  const isRunner = profile?.roles.includes('runner');
  const isAssignedRunner = task?.assignment?.runner_id === session?.user.id;
  const escrowHeld = escrow?.status === 'held';

  const runAction = async (fn: () => Promise<void>, successMsg: string) => {
    setActing(true);
    try {
      await fn();
      await refetch();
      await refetchEscrow();
      void queryClient.invalidateQueries({ queryKey: ['nearby-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
      Alert.alert(successMsg);
    } catch (err) {
      if (isInsufficientBalanceError(err)) {
        Alert.alert(t('escrow.insufficientBalance'), '', [
          { text: t('wallet.deposit'), onPress: () => router.push('/profile/wallet') },
        ]);
      } else {
        Alert.alert(t('common.error'));
      }
    } finally {
      setActing(false);
    }
  };

  if (isLoading || !task) return <LoadingScreen />;

  const canChat =
    (isEmployer || isAssignedRunner) &&
    Boolean(task.assignment) &&
    !['cancelled'].includes(task.status);

  const canReview =
    (isEmployer || isAssignedRunner) &&
    ['completed', 'verified'].includes(task.status);

  const openChat = async () => {
    setOpeningChat(true);
    try {
      const convId = await getOrCreateTaskConversation(task.id);
      router.push(`/chat/${convId}`);
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setOpeningChat(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.badge}>{t(`runner.${STATUS_LABELS[task.status] ?? 'statusOpen'}`)}</Text>
      <Text style={styles.title}>{task.title}</Text>

      {task.employer?.company_name && (
        <Text style={styles.meta}>{task.employer.company_name}</Text>
      )}
      {task.category && <Text style={styles.meta}>{ln(task.category)}</Text>}
      {task.region && <Text style={styles.meta}>{ln(task.region)}</Text>}
      {task.address_text && <Text style={styles.meta}>📍 {task.address_text}</Text>}

      <Text style={styles.price}>
        {task.price_amount.toLocaleString()} {task.price_currency}
      </Text>

      {escrow && (
        <View style={styles.escrowBox}>
          <Text style={styles.escrowTitle}>{t('escrow.title')}</Text>
          <Text style={styles.escrowStatus}>
            {t(`escrow.${escrow.status === 'held' ? 'held' : escrow.status}`)}
          </Text>
          <Text style={styles.escrowMeta}>
            {t('escrow.fee')}: {calcPlatformFee(escrow.amount).toLocaleString()} UZS
          </Text>
          <Text style={styles.escrowMeta}>
            {t('escrow.net')}: {calcNetPayout(escrow.amount).toLocaleString()} UZS
          </Text>
        </View>
      )}

      {task.task_images && task.task_images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.images}>
          {task.task_images.map((img) => (
            <Image key={img.id} source={{ uri: getTaskImageUrl(img.storage_path) }} style={styles.image} />
          ))}
        </ScrollView>
      )}

      <Text style={styles.section}>{t('runner.description')}</Text>
      <Text style={styles.description}>{task.description}</Text>

      <View style={styles.actions}>
        {canChat && (
          <Button
            title={t('chat.openChat')}
            variant="outline"
            loading={openingChat}
            onPress={() => void openChat()}
          />
        )}

        {isEmployer && !escrowHeld && task.status === 'open' && (
          <Button
            title={t('escrow.hold')}
            loading={acting}
            onPress={() =>
              void runAction(() => holdEscrowForTask(task.id), t('escrow.funded'))
            }
          />
        )}

        {isRunner && task.status === 'open' && escrowHeld && (
          <Button
            title={t('runner.acceptTask')}
            loading={acting}
            onPress={() => void runAction(() => acceptTask(task.id), t('runner.taskAccepted'))}
          />
        )}

        {isAssignedRunner && task.status === 'accepted' && (
          <Button
            title={t('runner.startTask')}
            loading={acting}
            onPress={() => void runAction(() => startTask(task.id), t('runner.activeTask'))}
          />
        )}

        {isAssignedRunner && task.status === 'in_progress' && (
          <Button
            title={t('runner.completeTask')}
            loading={acting}
            onPress={() =>
              Alert.alert(t('runner.confirmComplete'), '', [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('runner.completeTask'),
                  onPress: () =>
                    void runAction(() => completeTask(task.id), t('runner.taskCompleted')),
                },
              ])
            }
          />
        )}

        {isEmployer && task.status === 'completed' && escrowHeld && (
          <Button
            title={t('runner.verifyTask')}
            loading={acting}
            onPress={() =>
              Alert.alert(t('runner.confirmVerify'), t('escrow.release'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('escrow.release'),
                  onPress: () =>
                    void runAction(
                      () => releaseEscrowForTask(task.id),
                      t('escrow.releaseSuccess'),
                    ),
                },
              ])
            }
          />
        )}

        {isEmployer && task.status === 'open' && (
          <Button
            title={t('runner.cancelTask')}
            variant="outline"
            loading={acting}
            onPress={() =>
              void runAction(async () => {
                if (escrowHeld) await refundEscrowForTask(task.id);
                await cancelTask(task.id);
              }, t('escrow.refundSuccess'))
            }
          />
        )}

        {escrowHeld &&
          (isEmployer || isAssignedRunner) &&
          ['accepted', 'in_progress', 'completed'].includes(task.status) && (
            <>
              {!showDispute ? (
                <Button
                  title={t('escrow.dispute')}
                  variant="outline"
                  onPress={() => setShowDispute(true)}
                />
              ) : (
                <View style={styles.disputeBox}>
                  <Input
                    label={t('escrow.disputeReason')}
                    value={disputeReason}
                    onChangeText={setDisputeReason}
                    multiline
                    style={styles.disputeInput}
                  />
                  <Button
                    title={t('escrow.dispute')}
                    loading={acting}
                    onPress={() =>
                      void runAction(
                        () => disputeEscrowForTask(task.id, disputeReason),
                        t('escrow.disputeSuccess'),
                      )
                    }
                  />
                </View>
              )}
            </>
          )}
      </View>

      {canReview && (
        <ReviewForm
          taskId={task.id}
          alreadyReviewed={Boolean(myReview)}
          onSubmitted={() => void refetchReview()}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  price: { fontSize: 22, fontWeight: '700', color: colors.runnerAccent, marginTop: spacing.md },
  escrowBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  escrowTitle: { fontWeight: '700', color: colors.primaryDark, marginBottom: 4 },
  escrowStatus: { color: colors.primary, fontWeight: '600' },
  escrowMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  images: { marginTop: spacing.md },
  image: { width: 200, height: 140, borderRadius: 12, marginRight: spacing.sm },
  section: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: spacing.lg },
  description: { fontSize: 15, lineHeight: 22, color: colors.text, marginTop: spacing.sm },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
  disputeBox: { gap: spacing.sm },
  disputeInput: { minHeight: 80, textAlignVertical: 'top' },
});
