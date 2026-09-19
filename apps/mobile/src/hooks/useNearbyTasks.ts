import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { fetchNearbyTasks, subscribeToOpenTasks } from '@/modules/runner/api';

export function useNearbyTasks(lat: number | null, lng: number | null, radiusMeters = 10000) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['nearby-tasks', lat, lng, radiusMeters],
    queryFn: () => fetchNearbyTasks(lat!, lng!, radiusMeters),
    enabled: lat !== null && lng !== null,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const channel = subscribeToOpenTasks(() => {
      void queryClient.invalidateQueries({ queryKey: ['nearby-tasks'] });
    });
    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);

  return query;
}

export function useUserLocation() {
  const query = useQuery({
    queryKey: ['user-location'],
    queryFn: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({});
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    },
    staleTime: 30_000,
  });

  return query;
}
