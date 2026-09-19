import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { CreateVacancyInput, ExperienceLevel, JobType } from '@runner/shared';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useAuth } from '@/providers/AuthProvider';
import { useLocalizedName } from '@/hooks/useLocalizedName';
import { pickImage } from '@/lib/images';
import {
  createVacancy,
  EXPERIENCE_LEVELS,
  fetchIndustries,
  fetchRegions,
  JOB_TYPES,
  updateVacancy,
  uploadVacancyImage,
} from '@/modules/jobs/api';
import { parseSalaryInput } from '@/modules/jobs/utils';
import { Button, Input } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function CreateVacancyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const ln = useLocalizedName();
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState<CreateVacancyInput>({
    title: '',
    description: '',
    job_type: 'permanent',
    experience_level: 'none',
    is_salary_visible: true,
  });
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [pendingImages, setPendingImages] = useState<{ uri: string; mimeType?: string }[]>([]);

  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: fetchRegions });
  const { data: industries = [] } = useQuery({ queryKey: ['industries'], queryFn: fetchIndustries });

  const handleAddImage = async () => {
    const asset = await pickImage();
    if (asset) setPendingImages((prev) => [...prev, { uri: asset.uri, mimeType: asset.mimeType }]);
  };

  const handleSetLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setForm((f) => ({
        ...f,
        location: { lat: loc.coords.latitude, lng: loc.coords.longitude },
      }));
      Alert.alert(t('jobs.locationSet'));
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!session?.user.id || !form.title.trim() || !form.description.trim()) {
      Alert.alert(t('common.error'));
      return;
    }
    if (!form.location) {
      Alert.alert(t('jobs.locationRequired'));
      return;
    }

    setSaving(true);
    try {
      const vacancy = await createVacancy(session.user.id, {
        ...form,
        salary_min: parseSalaryInput(salaryMin),
        salary_max: parseSalaryInput(salaryMax),
      });

      for (const img of pendingImages) {
        await uploadVacancyImage(
          session.user.id,
          vacancy.id,
          img.uri,
          img.mimeType ?? 'image/jpeg',
        );
      }

      if (publish) {
        await updateVacancy(vacancy.id, { status: 'published' });
      }

      router.replace(`/jobs/employer/${vacancy.id}`);
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const ChipSelect = <T extends string>({
    label,
    items,
    value,
    onChange,
    labelFn,
  }: {
    label: string;
    items: readonly T[];
    value: T;
    onChange: (v: T) => void;
    labelFn: (v: T) => string;
  }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {items.map((item) => (
          <Pressable
            key={item}
            style={[styles.chip, value === item && styles.chipActive]}
            onPress={() => onChange(item)}
          >
            <Text style={[styles.chipText, value === item && styles.chipTextActive]}>
              {labelFn(item)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input
        label={t('jobs.titleLabel')}
        value={form.title}
        onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
      />
      <Input
        label={t('jobs.description')}
        value={form.description}
        onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
        multiline
        numberOfLines={6}
        style={styles.textArea}
      />

      <Text style={styles.label}>{t('jobs.location')}</Text>
      <Button
        title={form.location ? `✓ ${t('jobs.locationSet')}` : t('jobs.setLocation')}
        variant={form.location ? 'secondary' : 'outline'}
        onPress={() => void handleSetLocation()}
        loading={locating}
      />
      {form.location ? (
        <Text style={styles.coords}>
          {form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}
        </Text>
      ) : null}

      <ChipSelect
        label={t('jobs.filters.jobType')}
        items={JOB_TYPES}
        value={form.job_type}
        onChange={(v) => setForm((f) => ({ ...f, job_type: v as JobType }))}
        labelFn={(v) => t(`jobs.${v}`)}
      />

      <ChipSelect
        label={t('jobs.filters.experience')}
        items={EXPERIENCE_LEVELS}
        value={form.experience_level}
        onChange={(v) => setForm((f) => ({ ...f, experience_level: v as ExperienceLevel }))}
        labelFn={(v) => t(`resume.levels.${v}`)}
      />

      <Text style={styles.label}>{t('jobs.filters.region')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
        {regions.map((r) => (
          <Pressable
            key={r.id}
            style={[styles.chip, form.region_id === r.id && styles.chipActive]}
            onPress={() => setForm((f) => ({ ...f, region_id: f.region_id === r.id ? null : r.id }))}
          >
            <Text style={[styles.chipText, form.region_id === r.id && styles.chipTextActive]}>
              {ln(r)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[styles.label, { marginTop: spacing.md }]}>{t('jobs.filters.industry')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
        {industries.map((i) => (
          <Pressable
            key={i.id}
            style={[styles.chip, form.industry_id === i.id && styles.chipActive]}
            onPress={() => setForm((f) => ({ ...f, industry_id: f.industry_id === i.id ? null : i.id }))}
          >
            <Text style={[styles.chipText, form.industry_id === i.id && styles.chipTextActive]}>
              {ln(i)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Input label={t('jobs.filters.salaryMin')} value={salaryMin} onChangeText={setSalaryMin} keyboardType="number-pad" />
      <Input label={t('jobs.filters.salaryMax')} value={salaryMax} onChangeText={setSalaryMax} keyboardType="number-pad" />

      <Pressable style={styles.addPhoto} onPress={() => void handleAddImage()}>
        <Text style={styles.addPhotoText}>📷 {t('jobs.addPhoto')}</Text>
      </Pressable>
      <ScrollView horizontal style={styles.imageRow}>
        {pendingImages.map((img, idx) => (
          <Image key={idx} source={{ uri: img.uri }} style={styles.thumb} />
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <Button title={t('jobs.draft')} variant="outline" onPress={() => void handleSave(false)} loading={saving} />
        <Button title={t('jobs.publish')} onPress={() => void handleSave(true)} loading={saving} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  field: { marginBottom: spacing.md },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.sm },
  coords: { color: colors.primary, fontSize: 13, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  hScroll: { marginBottom: spacing.sm },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  addPhoto: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addPhotoText: { color: colors.primary, fontWeight: '600' },
  imageRow: { marginBottom: spacing.md },
  thumb: { width: 80, height: 80, borderRadius: 8, marginRight: spacing.sm },
  actions: { gap: spacing.sm },
});
