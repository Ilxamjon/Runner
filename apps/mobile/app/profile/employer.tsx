import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Input, LoadingScreen } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { fetchEmployerProfile, upsertEmployerProfile } from '@/modules/profile/api';
import { colors, spacing } from '@/theme';

export default function EmployerProfileScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (!session?.user.id) return;
    void fetchEmployerProfile(session.user.id)
      .then((data) => {
        if (!data) return;
        setCompanyName(data.company_name);
        setDescription(data.description ?? '');
        setWebsite(data.website ?? '');
      })
      .finally(() => setLoading(false));
  }, [session?.user.id]);

  const handleSave = async () => {
    if (!session?.user.id) return;
    if (!companyName.trim()) {
      Alert.alert(t('onboarding.companyRequired'));
      return;
    }

    setSaving(true);
    try {
      await upsertEmployerProfile(session.user.id, {
        company_name: companyName.trim(),
        description: description.trim() || null,
        website: website.trim() || null,
      });
      Alert.alert(t('employer.saved'));
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input
        label={t('employer.companyName')}
        value={companyName}
        onChangeText={setCompanyName}
      />
      <Input
        label={t('employer.description')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={styles.textArea}
      />
      <Input
        label={t('employer.website')}
        value={website}
        onChangeText={setWebsite}
        keyboardType="url"
        autoCapitalize="none"
        placeholder="https://"
      />
      <Button title={t('common.save')} onPress={handleSave} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
});
