import Constants from 'expo-constants';
import { Redirect } from 'expo-router';
import { LoadingScreen } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';

export default function Index() {
  const { session, profile, loading } = useAuth();
  const appEnv = Constants.expoConfig?.extra?.environment;

  // The demo build is a self-contained, offline prototype and must not require login.
  if (appEnv === 'demo') return <Redirect href="/demo" />;

  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/auth/sign-in" />;
  if (!profile?.onboarding_completed) return <Redirect href="/onboarding" />;

  return <Redirect href="/(tabs)" />;
}
