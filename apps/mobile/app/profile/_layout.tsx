import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';

export default function ProfileLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="resume" options={{ title: t('resume.title') }} />
      <Stack.Screen name="employer" options={{ title: t('employer.title') }} />
      <Stack.Screen name="wallet" options={{ title: t('wallet.title') }} />
      <Stack.Screen name="verifications" options={{ title: t('verification.title') }} />
      <Stack.Screen name="reviews" options={{ title: t('reviews.title') }} />
    </Stack>
  );
}
