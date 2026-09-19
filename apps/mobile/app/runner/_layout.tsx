import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';

export default function RunnerLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="create" options={{ title: t('runner.createTask') }} />
      <Stack.Screen name="[id]" options={{ title: t('runner.taskDetail') }} />
      <Stack.Screen name="my-tasks" options={{ title: t('runner.myTasks') }} />
    </Stack>
  );
}
