import { Linking, Platform } from 'react-native';

export function parseLocation(geo: unknown): { lat: number; lng: number } | null {
  if (!geo) return null;
  if (typeof geo === 'object' && geo !== null) {
    if ('coordinates' in geo) {
      const coords = (geo as { coordinates: [number, number] }).coordinates;
      if (typeof coords?.[0] === 'number' && typeof coords?.[1] === 'number') {
        return { lng: coords[0], lat: coords[1] };
      }
    }
    if ('lat' in geo && 'lng' in geo) {
      const point = geo as { lat: number; lng: number };
      if (typeof point.lat === 'number' && typeof point.lng === 'number') {
        return point;
      }
    }
  }
  return null;
}

export async function openMapsNavigation(lat: number, lng: number, label: string) {
  const name = encodeURIComponent(label || 'Ish joyi');
  const google = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=driving`;
  const geo = `geo:${lat},${lng}?q=${lat},${lng}(${name})`;
  const apple = `http://maps.apple.com/?daddr=${lat},${lng}&q=${name}`;

  const preferred = Platform.OS === 'ios' ? apple : geo;
  try {
    const can = await Linking.canOpenURL(preferred);
    await Linking.openURL(can ? preferred : google);
  } catch {
    await Linking.openURL(google);
  }
}
