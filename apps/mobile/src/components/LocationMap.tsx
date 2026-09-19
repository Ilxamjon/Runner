import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, spacing } from '@/theme';

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
};

type Props = {
  latitude: number;
  longitude: number;
  zoom?: number;
  markers: MapMarker[];
  /** Always show title above the pin */
  showTitleLabels?: boolean;
  height?: number;
  onMarkerPress?: (id: string) => void;
};

function buildHtml(
  latitude: number,
  longitude: number,
  zoom: number,
  markers: MapMarker[],
  showTitleLabels: boolean,
) {
  const safeMarkers = markers.map((m) => ({
    ...m,
    title: m.title.replace(/[<>&'"]/g, ''),
  }));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; background: #dbeafe; }
    .job-label {
      background: #0F766E;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      white-space: nowrap;
    }
    .job-label::before { border-top-color: #0F766E !important; }
    .leaflet-tooltip-top.job-label::before { border-top-color: #0F766E; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var center = [${latitude}, ${longitude}];
      var markers = ${JSON.stringify(safeMarkers)};
      var showLabels = ${showTitleLabels ? 'true' : 'false'};
      var map = L.map('map', { zoomControl: true }).setView(center, ${zoom});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'OpenStreetMap'
      }).addTo(map);
      markers.forEach(function (m) {
        var marker = L.marker([m.lat, m.lng]).addTo(map);
        if (showLabels) {
          marker.bindTooltip(m.title, {
            permanent: true,
            direction: 'top',
            offset: [0, -12],
            className: 'job-label',
            opacity: 1
          });
        } else {
          marker.bindPopup(m.title);
        }
        marker.on('click', function () {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker', id: m.id }));
          }
        });
      });
      if (markers.length > 1) {
        var group = L.featureGroup(markers.map(function (m) { return L.marker([m.lat, m.lng]); }));
        map.fitBounds(group.getBounds().pad(0.2));
      }
      setTimeout(function () { map.invalidateSize(); }, 250);
    })();
  </script>
</body>
</html>`;
}

export function LocationMap({
  latitude,
  longitude,
  zoom = 15,
  markers,
  showTitleLabels = true,
  height,
  onMarkerPress,
}: Props) {
  const html = useMemo(
    () => buildHtml(latitude, longitude, zoom, markers, showTitleLabels),
    [latitude, longitude, zoom, markers, showTitleLabels],
  );

  return (
    <View style={[styles.map, height ? { height, flex: 0 } : null]}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://localhost' }}
        style={styles.map}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
            if (data.type === 'marker' && data.id) onMarkerPress?.(data.id);
          } catch {
            // ignore
          }
        }}
        renderError={() => (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>Xarita yuklanmadi</Text>
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: '#dbeafe', borderRadius: 12, overflow: 'hidden' },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  fallbackText: { color: colors.textSecondary, textAlign: 'center' },
});
