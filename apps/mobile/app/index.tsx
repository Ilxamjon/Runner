import { Redirect } from 'expo-router';
import { LoadingScreen } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/auth/sign-in" />;
  if (!profile?.onboarding_completed) return <Redirect href="/onboarding" />;

  return <Redirect href="/(tabs)" />;
}
