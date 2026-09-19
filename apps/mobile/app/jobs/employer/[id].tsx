import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ExperienceLevel, JobType } from '@runner/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useAuth } from '@/providers/AuthProvider';
import { useLocalizedName } from '@/hooks/useLocalizedName';
import { pickImage } from '@/lib/images';
import {
  deleteVacancy,
  EXPERIENCE_LEVELS,
  fetchIndustries,
  fetchRegions,
  fetchVacancyById,
  getVacancyImageUrl,
  JOB_TYPES,
  setVacancyLocation,
  updateVacancy,
  uploadVacancyImage,
} from '@/modules/jobs/api';
import { parseSalaryInput } from '@/modules/jobs/utils';
import { Button, Input, LoadingScreen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function EditVacancyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const ln = useLocalizedName();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: vacancy, isLoading, isError, refetch } = useQuery({
    queryKey: ['vacancy', id],
    queryFn: () => fetchVacancyById(id!),
    enabled: !!id,
  });

  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: fetchRegions });
  const { data: industries = [] } = useQuery({ queryKey: ['industries'], queryFn: fetchIndustries });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [jobType, setJobType] = useState<JobType>('permanent');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('none');
  const [regionId, setRegionId] = useState<string | null>(null);
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!vacancy) return;
    setTitle(vacancy.title);
    setDescription(vacancy.description);
    setJobType(vacancy.job_type);
    setExperienceLevel(vacancy.experience_level);
    setRegionId(vacancy.region_id);
    setIndustryId(vacancy.industry_id);
    setSalaryMin(vacancy.salary_min ? String(vacancy.salary_min) : '');
    setSalaryMax(vacancy.salary_max ? String(vacancy.salary_max) : '');
    setCoords(vacancy.location ?? null);
  }, [vacancy]);

  const handleSetLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCoords(next);
      if (id) {
        await setVacancyLocation(id, next.lat, next.lng);
        await queryClient.invalidateQueries({ queryKey: ['vacancy', id] });
      }
      Alert.alert(t('jobs.locationSet'));
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async (publish?: boolean) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateVacancy(id, {
        title: title.trim(),
        description: description.trim(),
        job_type: jobType,
        experience_level: experienceLevel,
        region_id: regionId,
        industry_id: industryId,
        salary_min: parseSalaryInput(salaryMin),
        salary_max: parseSalaryInput(salaryMax),
        ...(coords ? { location: coords } : {}),
        ...(publish ? { status: 'published' } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ['vacancy', id] });
      Alert.alert(t('common.save'));
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddImage = async () => {
    if (!session?.user.id || !id) return;
    const asset = await pickImage();
    if (!asset) return;
    try {
      await uploadVacancyImage(session.user.id, id, asset.uri, asset.mimeType ?? 'image/jpeg');
      await queryClient.invalidateQueries({ queryKey: ['vacancy', id] });
    } catch {
      Alert.alert(t('common.error'));
    }
  };

  const handleDelete = () => {
    Alert.alert(t('jobs.deleteVacancy'), t('jobs.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'O\'chirish',
        style: 'destructive',
        onPress: async () => {
          await deleteVacancy(id!);
          router.replace('/jobs/employer');
        },
      },
    ]);
  };

  if (isLoading) return <LoadingScreen />;

  if (isError || !vacancy) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <Button title={t('common.retry')} onPress={() => void refetch()} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.badge, vacancy.status === 'published' && styles.badgePublished]}>
        {t(`jobs.${vacancy.status}`)}
      </Text>

      <Input label={t('jobs.titleLabel')} value={title} onChangeText={setTitle} />
      <Input
        label={t('jobs.description')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={6}
        style={styles.textArea}
      />

      <Text style={styles.label}>{t('jobs.location')}</Text>
      <Button
        title={coords ? `✓ ${t('jobs.locationSet')}` : t('jobs.setLocation')}
        variant={coords ? 'secondary' : 'outline'}
        onPress={() => void handleSetLocation()}
        loading={locating}
      />
      {coords ? (
        <Text style={styles.coords}>
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </Text>
      ) : null}

      <Text style={styles.label}>{t('jobs.filters.jobType')}</Text>
      <View style={styles.chips}>
        {JOB_TYPES.map((type) => (
          <Pressable
            key={type}
            style={[styles.chip, jobType === type && styles.chipActive]}
            onPress={() => setJobType(type)}
          >
            <Text style={[styles.chipText, jobType === type && styles.chipTextActive]}>
              {t(`jobs.${type}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('jobs.filters.experience')}</Text>
      <View style={styles.chips}>
        {EXPERIENCE_LEVELS.map((level) => (
          <Pressable
            key={level}
            style={[styles.chip, experienceLevel === level && styles.chipActive]}
            onPress={() => setExperienceLevel(level)}
          >
            <Text style={[styles.chipText, experienceLevel === level && styles.chipTextActive]}>
              {t(`resume.levels.${level}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('jobs.filters.region')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {regions.map((r) => (
          <Pressable
            key={r.id}
            style={[styles.chip, regionId === r.id && styles.chipActive]}
            onPress={() => setRegionId(regionId === r.id ? null : r.id)}
          >
            <Text style={[styles.chipText, regionId === r.id && styles.chipTextActive]}>{ln(r)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[styles.label, { marginTop: spacing.md }]}>{t('jobs.filters.industry')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {industries.map((i) => (
          <Pressable
            key={i.id}
            style={[styles.chip, industryId === i.id && styles.chipActive]}
            onPress={() => setIndustryId(industryId === i.id ? null : i.id)}
          >
            <Text style={[styles.chipText, industryId === i.id && styles.chipTextActive]}>{ln(i)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Input label={t('jobs.filters.salaryMin')} value={salaryMin} onChangeText={setSalaryMin} keyboardType="number-pad" />
      <Input label={t('jobs.filters.salaryMax')} value={salaryMax} onChangeText={setSalaryMax} keyboardType="number-pad" />

      {vacancy.vacancy_images && vacancy.vacancy_images.length > 0 && (
        <ScrollView horizontal style={styles.imageRow}>
          {vacancy.vacancy_images.map((img) => (
            <Image key={img.id} source={{ uri: getVacancyImageUrl(img.storage_path) }} style={styles.thumb} />
          ))}
        </ScrollView>
      )}
      <Pressable style={styles.addPhoto} onPress={() => void handleAddImage()}>
        <Text style={styles.addPhotoText}>📷 {t('jobs.addPhoto')}</Text>
      </Pressable>

      <View style={styles.actions}>
        <Button title={t('common.save')} onPress={() => void handleSave()} loading={saving} />
        {vacancy.status !== 'published' && (
          <Button title={t('jobs.publish')} onPress={() => void handleSave(true)} loading={saving} />
        )}
        {vacancy.status === 'published' && (
          <Button
            title={t('jobs.closed')}
            variant="secondary"
            onPress={() => void updateVacancy(id!, { status: 'closed' }).then(() => router.back())}
          />
        )}
        <Button
          title={t('jobs.applicants')}
          variant="outline"
          onPress={() => router.push(`/jobs/employer/${id}/applicants`)}
        />
        <Button title={t('jobs.deleteVacancy')} variant="outline" onPress={handleDelete} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  errorText: { color: colors.error, textAlign: 'center' },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.border,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  badgePublished: { backgroundColor: '#DCFCE7', color: colors.success },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.sm },
  coords: { color: colors.primary, fontSize: 13, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  imageRow: { marginVertical: spacing.sm },
  thumb: { width: 80, height: 80, borderRadius: 8, marginRight: spacing.sm },
  addPhoto: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addPhotoText: { color: colors.primary, fontWeight: '600' },
  actions: { gap: spacing.sm },
});
