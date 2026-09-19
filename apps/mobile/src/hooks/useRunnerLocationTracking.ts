import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { updateRunnerLocation } from '@/modules/runner/api';

const INTERVAL_MS = 30_000;

export function useRunnerLocationTracking(enabled: boolean) {
  const lastUpdate = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const tick = async () => {
      const now = Date.now();
      if (now - lastUpdate.current < INTERVAL_MS) return;

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      if (!mounted) return;

      lastUpdate.current = now;
      try {
        await updateRunnerLocation(loc.coords.latitude, loc.coords.longitude);
      } catch {
        // silent — location update is best-effort
      }
    };

    void tick();
    const id = setInterval(() => void tick(), INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [enabled]);
}
