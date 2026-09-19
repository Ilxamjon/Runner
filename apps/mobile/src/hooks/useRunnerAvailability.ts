import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { fetchRunnerProfile, setRunnerAvailability } from '@/modules/profile/api';

export function useRunnerAvailability() {
  const { session, profile } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const isRunner = profile?.roles.includes('runner') ?? false;

  useEffect(() => {
    if (!session?.user.id || !isRunner) {
      setLoading(false);
      return;
    }

    void fetchRunnerProfile(session.user.id)
      .then((data) => setIsOnline(data?.is_available ?? false))
      .finally(() => setLoading(false));
  }, [session?.user.id, isRunner]);

  const toggleOnline = useCallback(async () => {
    if (!session?.user.id || !isRunner) return;
    setUpdating(true);
    try {
      const next = !isOnline;
      const data = await setRunnerAvailability(session.user.id, next);
      setIsOnline(data.is_available);
    } finally {
      setUpdating(false);
    }
  }, [session?.user.id, isRunner, isOnline]);

  return { isRunner, isOnline, loading, updating, toggleOnline };
}
