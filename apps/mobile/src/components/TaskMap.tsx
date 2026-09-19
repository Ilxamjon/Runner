import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { MicroTask, VacancyDetail } from '@runner/shared';
import { colors, spacing } from '@/theme';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Props = {
  region: Region;
  tasks: MicroTask[];
  vacancies?: VacancyDetail[];
  onRegionChangeComplete?: (region: Region) => void;
  onTaskPress: (task: MicroTask) => void;
  onVacancyPress?: (vacancy: VacancyDetail) => void;
};

function buildOsmHtml(region: Region, tasks: MicroTask[], vacancies: VacancyDetail[]) {
  const taskMarkers = tasks
    .filter((t) => t.location?.lat && t.location?.lng)
    .map((task) => ({
      id: task.id,
      kind: 'task' as const,
      lat: task.location.lat,
      lng: task.location.lng,
      title: task.title.replace(/[<>&'"]/g, ''),
    }));

  const jobMarkers = vacancies
    .filter((v) => v.location?.lat && v.location?.lng)
    .map((v) => ({
      id: v.id,
      kind: 'job' as const,
      lat: v.location!.lat,
      lng: v.location!.lng,
      title: v.title.replace(/[<>&'"]/g, ''),
    }));

  const markers = [...jobMarkers, ...taskMarkers];

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
    .leaflet-tooltip-top.job-label::before { border-top-color: #0F766E; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var center = [${region.latitude}, ${region.longitude}];
      var markers = ${JSON.stringify(markers)};
      var map = L.map('map', { zoomControl: true }).setView(center, 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'OpenStreetMap'
      }).addTo(map);
      L.circleMarker(center, {
        radius: 8,
        color: '#0F766E',
        fillColor: '#14B8A6',
        fillOpacity: 0.9
      }).addTo(map);
      markers.forEach(function (m) {
        var marker = L.marker([m.lat, m.lng]).addTo(map);
        if (m.kind === 'job') {
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
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: m.kind, id: m.id }));
          }
        });
      });
      setTimeout(function () { map.invalidateSize(); }, 200);
    })();
  </script>
</body>
</html>`;
}

export function TaskMap({ region, tasks, vacancies = [], onTaskPress, onVacancyPress }: Props) {
  const html = useMemo(
    () => buildOsmHtml(region, tasks, vacancies),
    [region.latitude, region.longitude, tasks, vacancies],
  );

  return (
    <View style={styles.map}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://localhost' }}
        style={styles.map}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
            if (data.type === 'task' && data.id) {
              const task = tasks.find((t) => t.id === data.id);
              if (task) onTaskPress(task);
            }
            if (data.type === 'job' && data.id) {
              const vacancy = vacancies.find((v) => v.id === data.id);
              if (vacancy) onVacancyPress?.(vacancy);
            }
          } catch {
            // ignore
          }
        }}
        onError={() => {}}
        renderError={() => (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>Xarita yuklanmadi. Internetni tekshiring.</Text>
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: '#dbeafe' },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  fallbackText: { color: colors.textSecondary, textAlign: 'center' },
});
