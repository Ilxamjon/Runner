import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import type { ExperienceLevel } from '@runner/shared';
import { useTranslation } from 'react-i18next';
import { Button, Input, LoadingScreen } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import {
  EXPERIENCE_LEVELS,
  fetchCandidateProfile,
  upsertCandidateProfile,
} from '@/modules/profile/api';
import { colors, spacing } from '@/theme';

export default function ResumeScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headline, setHeadline] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('none');
  const [skills, setSkills] = useState('');
  const [education, setEducation] = useState('');
  const [workHistory, setWorkHistory] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!session?.user.id) return;
    void fetchCandidateProfile(session.user.id)
      .then((data) => {
        if (!data) return;
        setHeadline(data.headline ?? '');
        setExperienceYears(String(data.experience_years));
        setExperienceLevel(data.experience_level);
        setSkills(data.skills.join(', '));
        setEducation(
          data.education.length > 0
            ? JSON.stringify(data.education, null, 2)
            : '',
        );
        setWorkHistory(
          data.work_history.length > 0
            ? JSON.stringify(data.work_history, null, 2)
            : '',
        );
        setIsPublic(data.is_public);
      })
      .finally(() => setLoading(false));
  }, [session?.user.id]);

  const parseJsonArray = (raw: string) => {
    if (!raw.trim()) return [];
    return JSON.parse(raw) as Record<string, unknown>[];
  };

  const handleSave = async () => {
    if (!session?.user.id) return;
    setSaving(true);
    try {
      let educationData: Record<string, unknown>[] = [];
      let workData: Record<string, unknown>[] = [];
      try {
        educationData = parseJsonArray(education);
        workData = parseJsonArray(workHistory);
      } catch {
        Alert.alert(t('common.error'), 'JSON format noto\'g\'ri');
        return;
      }

      await upsertCandidateProfile(session.user.id, {
        headline: headline.trim() || null,
        experience_years: parseInt(experienceYears, 10) || 0,
        experience_level: experienceLevel,
        skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        education: educationData,
        work_history: workData,
        is_public: isPublic,
      });
      Alert.alert(t('resume.saved'));
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input label={t('resume.headline')} value={headline} onChangeText={setHeadline} />

      <Input
        label={t('resume.experienceYears')}
        value={experienceYears}
        onChangeText={setExperienceYears}
        keyboardType="number-pad"
      />

      <Text style={styles.label}>{t('resume.experienceLevel')}</Text>
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

      <Input
        label={t('resume.skills')}
        value={skills}
        onChangeText={setSkills}
        placeholder="Excel, Sotuv, Mijozlar bilan ishlash"
      />

      <Input
        label={t('resume.education')}
        value={education}
        onChangeText={setEducation}
        multiline
        numberOfLines={4}
        style={styles.textArea}
        placeholder='[{"degree": "Bakalavr", "school": "TATU"}]'
      />

      <Input
        label={t('resume.workHistory')}
        value={workHistory}
        onChangeText={setWorkHistory}
        multiline
        numberOfLines={4}
        style={styles.textArea}
        placeholder='[{"company": "Kompaniya", "role": "Sotuvchi", "years": 2}]'
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('resume.isPublic')}</Text>
        <Switch
          value={isPublic}
          onValueChange={setIsPublic}
          trackColor={{ true: colors.primaryLight }}
        />
      </View>

      <Button title={t('common.save')} onPress={handleSave} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  label: { color: colors.textSecondary, marginBottom: spacing.sm, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: '#fff' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  switchLabel: { fontSize: 16, color: colors.text },
});
