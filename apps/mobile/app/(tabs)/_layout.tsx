import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmployerHeaderButton } from '@/components/EmployerHeaderButton';
import { RunnerHeaderButtons } from '@/components/RunnerHeaderButtons';
import { LoadingScreen } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

export default function TabLayout() {
  const { t } = useTranslation();
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/auth/sign-in" />;
  if (!profile?.onboarding_completed) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('jobs.title'),
          tabBarLabel: t('tabs.jobs'),
          headerRight: () => <EmployerHeaderButton />,
        }}
      />
      <Tabs.Screen
        name="runner"
        options={{
          title: t('runner.title'),
          tabBarLabel: t('tabs.runner'),
          headerRight: () => <RunnerHeaderButtons />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarLabel: t('tabs.messages'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarLabel: t('tabs.profile'),
        }}
      />
    </Tabs>
  );
}
