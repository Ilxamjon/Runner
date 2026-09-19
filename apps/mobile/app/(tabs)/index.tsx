import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { JobType, VacancyFilters } from '@runner/shared';
import { DEFAULT_MAP_CENTER } from '@runner/shared';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LocationMap } from '@/components/LocationMap';
import { VacancyCard } from '@/components/VacancyCard';
import { VacancyFilterModal } from '@/components/VacancyFilterModal';
import { useUserLocation } from '@/hooks/useNearbyTasks';
import { fetchIndustries, fetchRegions, fetchVacancies, JOB_TYPES } from '@/modules/jobs/api';
import { colors, spacing } from '@/theme';

export default function JobsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [jobType, setJobType] = useState<JobType | null>(null);
  const [filters, setFilters] = useState<VacancyFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const { data: userLocation } = useUserLocation();

  const activeFilters: VacancyFilters = {
    ...filters,
    jobType: jobType ?? filters.jobType,
    query: query.trim() || filters.query,
  };

  const { data: vacancies = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['vacancies', activeFilters],
    queryFn: () => fetchVacancies(activeFilters),
  });

  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: fetchRegions });
  const { data: industries = [] } = useQuery({ queryKey: ['industries'], queryFn: fetchIndustries });

  const hasActiveFilters = Object.keys(filters).length > 0 || jobType !== null;

  const mapVacancies = useMemo(
    () => vacancies.filter((v) => v.location?.lat && v.location?.lng),
    [vacancies],
  );

  const mapCenter = userLocation
    ? { latitude: userLocation.lat, longitude: userLocation.lng }
    : mapVacancies[0]?.location
      ? { latitude: mapVacancies[0].location.lat, longitude: mapVacancies[0].location.lng }
      : DEFAULT_MAP_CENTER;

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder={t('common.search')}
          value={query}
          onChangeText={setQuery}
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
        />
        <Pressable
          style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
        >
          <Text style={[styles.filterBtnText, hasActiveFilters && styles.filterBtnTextActive]}>
            {t('common.filter')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeBtn, viewMode === 'list' && styles.modeBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.modeText, viewMode === 'list' && styles.modeTextActive]}>
            {t('jobs.listView')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, viewMode === 'map' && styles.modeBtnActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[styles.modeText, viewMode === 'map' && styles.modeTextActive]}>
            {t('jobs.mapView')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {JOB_TYPES.map((type) => (
          <Pressable
            key={type}
            style={[styles.chip, jobType === type && styles.chipActive]}
            onPress={() => setJobType(jobType === type ? null : type)}
          >
            <Text style={[styles.chipText, jobType === type && styles.chipTextActive]}>
              {t(`jobs.${type}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : viewMode === 'map' ? (
        <View style={styles.mapWrap}>
          <LocationMap
            latitude={mapCenter.latitude}
            longitude={mapCenter.longitude}
            zoom={13}
            showTitleLabels
            markers={mapVacancies.map((v) => ({
              id: v.id,
              lat: v.location!.lat,
              lng: v.location!.lng,
              title: v.title,
            }))}
            onMarkerPress={(markerId) => {
              const vacancy = mapVacancies.find((v) => v.id === markerId);
              if (!vacancy) return;
              router.push(`/jobs/${vacancy.id}`);
            }}
          />
          {mapVacancies.length === 0 ? (
            <Text style={styles.mapEmpty}>{t('jobs.noResults')}</Text>
          ) : (
            <Text style={styles.mapHint}>{t('jobs.viewOnMap')}</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={vacancies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <Text style={styles.empty}>{t('jobs.noResults')}</Text>
          }
          renderItem={({ item }) => (
            <VacancyCard
              vacancy={item}
              onPress={() => router.push(`/jobs/${item.id}`)}
            />
          )}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/jobs/employer/create')}
        accessibilityRole="button"
        accessibilityLabel={t('jobs.createVacancy')}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>{t('jobs.createVacancy')}</Text>
      </Pressable>

      <VacancyFilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={setFilters}
        regions={regions}
        industries={industries}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  search: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { color: colors.textSecondary, fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  modeRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modeBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.primary },
  modeText: { color: colors.textSecondary, fontWeight: '600' },
  modeTextActive: { color: '#fff' },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: '#fff' },
  loader: { marginTop: spacing.xl },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
  mapWrap: { flex: 1, margin: spacing.md, marginBottom: 100 },
  mapEmpty: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 8,
  },
  mapHint: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabIcon: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
