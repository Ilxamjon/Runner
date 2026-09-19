import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ExperienceLevel, Industry, JobType, Region, VacancyFilters } from '@runner/shared';
import { useTranslation } from 'react-i18next';
import { useLocalizedName } from '@/hooks/useLocalizedName';
import { EXPERIENCE_LEVELS, JOB_TYPES } from '@/modules/jobs/api';
import { Button, Input } from '@/components/ui';
import { colors, spacing } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: VacancyFilters;
  onApply: (filters: VacancyFilters) => void;
  regions: Region[];
  industries: Industry[];
}

export function VacancyFilterModal({
  visible,
  onClose,
  filters,
  onApply,
  regions,
  industries,
}: Props) {
  const { t } = useTranslation();
  const ln = useLocalizedName();
  const [local, setLocal] = useState<VacancyFilters>(filters);

  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  const setField = <K extends keyof VacancyFilters>(key: K, value: VacancyFilters[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const ChipRow = <T extends string>({
    items,
    selected,
    onSelect,
    labelFn,
  }: {
    items: readonly T[];
    selected: T | undefined;
    onSelect: (v: T | undefined) => void;
    labelFn: (v: T) => string;
  }) => (
    <View style={styles.chipRow}>
      <Pressable
        style={[styles.chip, !selected && styles.chipActive]}
        onPress={() => onSelect(undefined)}
      >
        <Text style={[styles.chipText, !selected && styles.chipTextActive]}>
          {t('jobs.filters.all')}
        </Text>
      </Pressable>
      {items.map((item) => (
        <Pressable
          key={item}
          style={[styles.chip, selected === item && styles.chipActive]}
          onPress={() => onSelect(selected === item ? undefined : item)}
        >
          <Text style={[styles.chipText, selected === item && styles.chipTextActive]}>
            {labelFn(item)}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <Text style={styles.title}>{t('common.filter')}</Text>
        <ScrollView style={styles.scroll}>
          <Text style={styles.label}>{t('jobs.filters.region')}</Text>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, !local.regionId && styles.chipActive]}
              onPress={() => setField('regionId', undefined)}
            >
              <Text style={[styles.chipText, !local.regionId && styles.chipTextActive]}>
                {t('jobs.filters.all')}
              </Text>
            </Pressable>
            {regions.map((r) => (
              <Pressable
                key={r.id}
                style={[styles.chip, local.regionId === r.id && styles.chipActive]}
                onPress={() => setField('regionId', local.regionId === r.id ? undefined : r.id)}
              >
                <Text style={[styles.chipText, local.regionId === r.id && styles.chipTextActive]}>
                  {ln(r)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{t('jobs.filters.industry')}</Text>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, !local.industryId && styles.chipActive]}
              onPress={() => setField('industryId', undefined)}
            >
              <Text style={[styles.chipText, !local.industryId && styles.chipTextActive]}>
                {t('jobs.filters.all')}
              </Text>
            </Pressable>
            {industries.map((i) => (
              <Pressable
                key={i.id}
                style={[styles.chip, local.industryId === i.id && styles.chipActive]}
                onPress={() => setField('industryId', local.industryId === i.id ? undefined : i.id)}
              >
                <Text style={[styles.chipText, local.industryId === i.id && styles.chipTextActive]}>
                  {ln(i)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{t('jobs.filters.jobType')}</Text>
          <ChipRow
            items={JOB_TYPES}
            selected={local.jobType}
            onSelect={(v) => setField('jobType', v as JobType | undefined)}
            labelFn={(v) => t(`jobs.${v}`)}
          />

          <Text style={styles.label}>{t('jobs.filters.experience')}</Text>
          <ChipRow
            items={EXPERIENCE_LEVELS}
            selected={local.experienceLevel}
            onSelect={(v) => setField('experienceLevel', v as ExperienceLevel | undefined)}
            labelFn={(v) => t(`resume.levels.${v}`)}
          />

          <Input
            label={t('jobs.filters.salaryMin')}
            value={local.salaryMin ? String(local.salaryMin) : ''}
            onChangeText={(v) => setField('salaryMin', v ? parseInt(v, 10) : undefined)}
            keyboardType="number-pad"
          />
          <Input
            label={t('jobs.filters.salaryMax')}
            value={local.salaryMax ? String(local.salaryMax) : ''}
            onChangeText={(v) => setField('salaryMax', v ? parseInt(v, 10) : undefined)}
            keyboardType="number-pad"
          />
        </ScrollView>

        <View style={styles.actions}>
          <Button
            title={t('jobs.filters.clear')}
            variant="outline"
            onPress={() => {
              onApply({});
              onClose();
            }}
          />
          <Button
            title={t('jobs.filters.apply')}
            onPress={() => {
              onApply(local);
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  scroll: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  actions: { gap: spacing.sm, paddingTop: spacing.md },
});
