import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/AuthProvider';
import { pickImage } from '@/lib/images';
import {
  fetchMyVerifications,
  submitIdentityVerification,
} from '@/modules/trust/api';
import { Button, LoadingScreen } from '@/components/ui';
import { colors, spacing } from '@/theme';

const STATUS_KEY = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const;

export default function VerificationsScreen() {
  const { t } = useTranslation();
  const { session, profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const { data: verifications = [], isLoading, refetch } = useQuery({
    queryKey: ['verifications', session?.user.id],
    queryFn: () => fetchMyVerifications(session!.user.id),
    enabled: !!session?.user.id,
  });

  const handlePick = async () => {
    const asset = await pickImage();
    if (asset) setPreview(asset.uri);
  };

  const handleSubmit = async () => {
    if (!session?.user.id || !preview) return;
    setUploading(true);
    try {
      await submitIdentityVerification(session.user.id, preview);
      setPreview(null);
      await refetch();
      Alert.alert(t('verification.submitted'));
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.phoneCard}>
        <Text style={styles.cardTitle}>{t('verification.phone')}</Text>
        <Text style={styles.status}>
          {profile?.phone_verified
            ? `✓ ${t('verification.approved')}`
            : t('verification.pending')}
        </Text>
        {profile?.phone && <Text style={styles.meta}>{profile.phone}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('verification.identity')}</Text>
        <Text style={styles.note}>{t('verification.note')}</Text>

        <Button title={t('verification.uploadDoc')} variant="outline" onPress={() => void handlePick()} />
        {preview && (
          <>
            <Image source={{ uri: preview }} style={styles.preview} />
            <Button
              title={t('verification.submit')}
              onPress={() => void handleSubmit()}
              loading={uploading}
            />
          </>
        )}
      </View>

      {verifications.map((v) => (
        <View key={v.id} style={styles.historyItem}>
          <Text style={styles.historyType}>
            {v.type === 'identity'
              ? t('verification.identity')
              : v.type === 'business'
                ? t('verification.business')
                : t('verification.phone')}
          </Text>
          <Text style={styles.historyStatus}>
            {t(`verification.${STATUS_KEY[v.status]}`)}
          </Text>
          <Text style={styles.meta}>{new Date(v.created_at).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  phoneCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  note: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  status: { marginTop: 4, color: colors.success, fontWeight: '500' },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  preview: { width: '100%', height: 200, borderRadius: 12, marginVertical: spacing.sm },
  historyItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyType: { fontWeight: '600', color: colors.text },
  historyStatus: { color: colors.primary, marginTop: 2 },
});
