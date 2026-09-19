import type { VacancyDetail } from '@runner/shared';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizedName } from '@/hooks/useLocalizedName';
import { formatSalary } from '@/modules/jobs/utils';
import { getVacancyImageUrl } from '@/modules/jobs/api';
import { colors, spacing } from '@/theme';

interface Props {
  vacancy: VacancyDetail;
  onPress: () => void;
}

function pickCover(vacancy: VacancyDetail) {
  const images = vacancy.vacancy_images?.slice() ?? [];
  if (images.length === 0) return null;

  return images.sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    if (tb !== ta) return tb - ta;
    return (b.sort_order ?? 0) - (a.sort_order ?? 0);
  })[0];
}

export function VacancyCard({ vacancy, onPress }: Props) {
  const { t } = useTranslation();
  const ln = useLocalizedName();
  const cover = pickCover(vacancy);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [cover?.id, vacancy.id]);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {cover && !failed ? (
        <Image
          key={cover.id}
          source={{ uri: getVacancyImageUrl(cover.storage_path) }}
          style={styles.cover}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title}>{vacancy.title}</Text>
        <Text style={styles.meta}>
          {t(`jobs.${vacancy.job_type}`)}
          {vacancy.region ? ` · ${ln(vacancy.region)}` : ''}
        </Text>
        {vacancy.industry && (
          <Text style={styles.industry}>{ln(vacancy.industry)}</Text>
        )}
        <Text style={styles.salary}>
          {t('jobs.salary')}: {formatSalary(vacancy)}
        </Text>
        {vacancy.location ? (
          <Text style={styles.mapLink}>{t('jobs.viewOnMap')} →</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: 160,
    backgroundColor: colors.border,
  },
  body: { padding: spacing.md },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  meta: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: 14 },
  industry: { marginTop: 2, color: colors.textSecondary, fontSize: 13 },
  salary: { marginTop: spacing.sm, color: colors.primary, fontWeight: '500', fontSize: 14 },
  mapLink: { marginTop: spacing.xs, color: colors.primaryDark, fontWeight: '600', fontSize: 13 },
});
