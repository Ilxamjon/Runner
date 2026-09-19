import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { submitTaskReview } from '@/modules/trust/api';
import { Button, Input } from '@/components/ui';
import { colors, spacing } from '@/theme';

interface Props {
  taskId: string;
  alreadyReviewed?: boolean;
  onSubmitted?: () => void;
}

export function ReviewForm({ taskId, alreadyReviewed, onSubmitted }: Props) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  if (alreadyReviewed) {
    return (
      <View style={styles.box}>
        <Text style={styles.done}>{t('reviews.alreadyReviewed')}</Text>
      </View>
    );
  }

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await submitTaskReview(taskId, rating, comment.trim() || undefined);
      Alert.alert(t('reviews.submitted'));
      onSubmitted?.();
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{t('reviews.leaveReview')}</Text>
      <Text style={styles.label}>{t('reviews.rating')}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)} style={styles.starBtn}>
            <Text style={[styles.star, n <= rating && styles.starActive]}>★</Text>
          </Pressable>
        ))}
      </View>
      <Input
        label={t('reviews.comment')}
        value={comment}
        onChangeText={setComment}
        multiline
        style={styles.comment}
      />
      <Button title={t('reviews.submit')} onPress={() => void handleSubmit()} loading={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.xs },
  stars: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  starBtn: { padding: 2 },
  star: { fontSize: 28, color: colors.border },
  starActive: { color: colors.runnerAccent },
  comment: { minHeight: 70, textAlignVertical: 'top' },
  done: { color: colors.success, fontWeight: '500', textAlign: 'center' },
});
