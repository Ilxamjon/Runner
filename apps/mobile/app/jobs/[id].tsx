import { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/AuthProvider';
import { useLocalizedName } from '@/hooks/useLocalizedName';
import { LocationMap } from '@/components/LocationMap';
import { openMapsNavigation } from '@/lib/geo';
import {
  applyToVacancy,
  fetchMyApplication,
  fetchVacancyById,
  getVacancyImageUrl,
  withdrawApplication,
} from '@/modules/jobs/api';
import { formatSalary, experienceLabel } from '@/modules/jobs/utils';
import { Button, Input, LoadingScreen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function VacancyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const ln = useLocalizedName();
  const [coverLetter, setCoverLetter] = useState('');
  const [showApply, setShowApply] = useState(false);
  const [applying, setApplying] = useState(false);

  const { data: vacancy, isLoading } = useQuery({
    queryKey: ['vacancy', id],
    queryFn: () => fetchVacancyById(id!),
    enabled: !!id,
  });

  const { data: myApplication, refetch: refetchApplication } = useQuery({
    queryKey: ['application', id],
    queryFn: () => fetchMyApplication(id!),
    enabled: !!id && profile?.roles.includes('candidate'),
  });

  const isCandidate = profile?.roles.includes('candidate');
  const canApply = isCandidate && !myApplication;
  const hasApplied = myApplication && myApplication.status !== 'withdrawn';

  const handleApply = async () => {
    if (!id) return;
    setApplying(true);
    try {
      await applyToVacancy(id, coverLetter.trim() || undefined);
      setShowApply(false);
      await refetchApplication();
      Alert.alert(t('jobs.applied'));
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setApplying(false);
    }
  };

  const handleWithdraw = () => {
    if (!myApplication) return;
    Alert.alert(t('jobs.withdraw'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('jobs.withdraw'),
        style: 'destructive',
        onPress: async () => {
          await withdrawApplication(myApplication.id);
          await refetchApplication();
        },
      },
    ]);
  };

  if (isLoading) return <LoadingScreen />;
  if (!vacancy) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ textAlign: 'center', color: colors.error }}>{t('common.error')}</Text>
      </View>
    );
  }

  const loc = vacancy.location;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{vacancy.title}</Text>

      {vacancy.employer?.company_name && (
        <Text style={styles.company}>
          {t('jobs.company')}: {vacancy.employer.company_name}
        </Text>
      )}

      <View style={styles.tags}>
        <Text style={styles.tag}>{t(`jobs.${vacancy.job_type}`)}</Text>
        {vacancy.region && <Text style={styles.tag}>{ln(vacancy.region)}</Text>}
        {vacancy.industry && <Text style={styles.tag}>{ln(vacancy.industry)}</Text>}
        <Text style={styles.tag}>{experienceLabel(vacancy.experience_level, t)}</Text>
      </View>

      <Text style={styles.salary}>{formatSalary(vacancy)}</Text>

      {vacancy.vacancy_images && vacancy.vacancy_images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.images}>
          {vacancy.vacancy_images.map((img) => (
            <Image
              key={img.id}
              source={{ uri: getVacancyImageUrl(img.storage_path) }}
              style={styles.image}
            />
          ))}
        </ScrollView>
      )}

      {loc ? (
        <View style={styles.mapBlock}>
          <Text style={styles.sectionTitle}>{t('jobs.location')}</Text>
          <LocationMap
            latitude={loc.lat}
            longitude={loc.lng}
            zoom={15}
            height={220}
            showTitleLabels
            markers={[{ id: vacancy.id, lat: loc.lat, lng: loc.lng, title: vacancy.title }]}
            onMarkerPress={() => void openMapsNavigation(loc.lat, loc.lng, vacancy.title)}
          />
          <Button
            title={t('jobs.openInMaps')}
            onPress={() => void openMapsNavigation(loc.lat, loc.lng, vacancy.title)}
          />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>{t('jobs.description')}</Text>
      <Text style={styles.description}>{vacancy.description}</Text>

      {hasApplied && (
        <View style={styles.appliedBox}>
          <Text style={styles.appliedText}>
            {t('jobs.applied')} — {t(`jobs.status.${myApplication!.status}`)}
          </Text>
          {myApplication!.status === 'submitted' && (
            <Button title={t('jobs.withdraw')} variant="outline" onPress={handleWithdraw} />
          )}
        </View>
      )}

      {canApply && !showApply && (
        <Button title={t('jobs.apply')} onPress={() => setShowApply(true)} />
      )}

      {showApply && (
        <View style={styles.applyBox}>
          <Input
            label={t('jobs.coverLetter')}
            value={coverLetter}
            onChangeText={setCoverLetter}
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
          <Button title={t('jobs.apply')} onPress={handleApply} loading={applying} />
          <Button title={t('common.cancel')} variant="outline" onPress={() => setShowApply(false)} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  company: { fontSize: 15, color: colors.textSecondary, marginTop: spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  tag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 13,
    color: colors.textSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  salary: { fontSize: 18, fontWeight: '600', color: colors.primary, marginTop: spacing.md },
  images: { marginTop: spacing.md },
  image: { width: 200, height: 140, borderRadius: 12, marginRight: spacing.sm },
  mapBlock: { marginTop: spacing.lg, gap: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: colors.text, marginTop: spacing.lg },
  description: { fontSize: 15, color: colors.text, lineHeight: 22, marginTop: spacing.sm },
  appliedBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    gap: spacing.sm,
  },
  appliedText: { color: colors.primaryDark, fontWeight: '500' },
  applyBox: { marginTop: spacing.lg, gap: spacing.sm },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
});
