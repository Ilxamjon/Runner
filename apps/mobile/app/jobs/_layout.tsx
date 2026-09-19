import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';

export default function JobsLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="employer/index" options={{ title: t('jobs.myVacancies') }} />
      <Stack.Screen name="employer/create" options={{ title: t('jobs.createVacancy') }} />
      <Stack.Screen name="employer/[id]" options={{ title: t('jobs.editVacancy') }} />
      <Stack.Screen name="employer/[id]/applicants" options={{ title: t('jobs.applicants') }} />
    </Stack>
  );
}
