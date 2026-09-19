import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { TaskUrgency } from '@runner/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useAuth } from '@/providers/AuthProvider';
import { useLocalizedName } from '@/hooks/useLocalizedName';
import { pickImage } from '@/lib/images';
import {
  calcNetPayout,
  calcPlatformFee,
  fetchWallet,
  holdEscrowForTask,
  isInsufficientBalanceError,
} from '@/modules/escrow/api';
import { fetchRegions } from '@/modules/jobs/api';
import {
  createTask,
  fetchTaskCategories,
  uploadTaskImage,
  URGENCY_LEVELS,
} from '@/modules/runner/api';
import { Button, Input } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function CreateTaskScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const ln = useLocalizedName();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [urgency, setUrgency] = useState<TaskUrgency>('normal');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [images, setImages] = useState<{ uri: string; mimeType?: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: categories = [] } = useQuery({ queryKey: ['task-categories'], queryFn: fetchTaskCategories });
  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: fetchRegions });
  const { data: wallet } = useQuery({
    queryKey: ['wallet', session?.user.id],
    queryFn: () => fetchWallet(session!.user.id),
    enabled: !!session?.user.id,
  });

  const priceAmount = parseInt(price.replace(/\D/g, ''), 10) || 0;

  const useCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  };

  const handleAddImage = async () => {
    const asset = await pickImage();
    if (asset) setImages((prev) => [...prev, { uri: asset.uri, mimeType: asset.mimeType }]);
  };

  const handleCreate = async () => {
    if (!session?.user.id || !title.trim() || !description.trim() || !price || !coords) {
      Alert.alert(t('common.error'));
      return;
    }

    if ((wallet?.balance ?? 0) < priceAmount) {
      Alert.alert(t('escrow.insufficientBalance'), '', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('wallet.deposit'), onPress: () => router.push('/profile/wallet') },
      ]);
      return;
    }

    setSaving(true);
    try {
      const task = await createTask({
        title: title.trim(),
        description: description.trim(),
        lat: coords.lat,
        lng: coords.lng,
        price_amount: priceAmount,
        category_id: categoryId,
        address_text: address.trim() || null,
        region_id: regionId,
        urgency,
      });

      for (const img of images) {
        await uploadTaskImage(session.user.id, task.id, img.uri, img.mimeType ?? 'image/jpeg');
      }

      await holdEscrowForTask(task.id);
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['nearby-tasks'] });

      Alert.alert(t('escrow.funded'));
      router.replace(`/runner/${task.id}`);
    } catch (err) {
      if (isInsufficientBalanceError(err)) {
        Alert.alert(t('escrow.insufficientBalance'), '', [
          { text: t('wallet.deposit'), onPress: () => router.push('/profile/wallet') },
        ]);
      } else {
        Alert.alert(t('common.error'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.walletHint}>
        <Text style={styles.walletHintText}>
          {t('wallet.balance')}: {(wallet?.balance ?? 0).toLocaleString()} UZS
        </Text>
        {priceAmount > 0 && (
          <Text style={styles.feeText}>
            {t('escrow.fee')}: {calcPlatformFee(priceAmount).toLocaleString()} ·{' '}
            {t('escrow.net')}: {calcNetPayout(priceAmount).toLocaleString()}
          </Text>
        )}
      </View>

      <Input label={t('runner.titleLabel')} value={title} onChangeText={setTitle} />
      <Input
        label={t('runner.description')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={styles.textArea}
      />
      <Input label={t('runner.price')} value={price} onChangeText={setPrice} keyboardType="number-pad" />
      <Input label={t('runner.address')} value={address} onChangeText={setAddress} />

      <Pressable style={styles.locationBtn} onPress={() => void useCurrentLocation()}>
        <Text style={styles.locationText}>
          📍 {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : t('runner.nearby')}
        </Text>
      </Pressable>

      <Text style={styles.label}>{t('runner.category')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, categoryId === c.id && styles.chipActive]}
            onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
          >
            <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{ln(c)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>{t('jobs.filters.region')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
        {regions.map((r) => (
          <Pressable
            key={r.id}
            style={[styles.chip, regionId === r.id && styles.chipActive]}
            onPress={() => setRegionId(regionId === r.id ? null : r.id)}
          >
            <Text style={[styles.chipText, regionId === r.id && styles.chipTextActive]}>{ln(r)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>{t('runner.urgent')}</Text>
      <View style={styles.chips}>
        {URGENCY_LEVELS.map((u) => (
          <Pressable
            key={u}
            style={[styles.chip, urgency === u && styles.chipActive]}
            onPress={() => setUrgency(u)}
          >
            <Text style={[styles.chipText, urgency === u && styles.chipTextActive]}>
              {t(`runner.${u}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.addPhoto} onPress={() => void handleAddImage()}>
        <Text style={styles.addPhotoText}>📷 {t('runner.addPhoto')}</Text>
      </Pressable>
      <ScrollView horizontal>
        {images.map((img, i) => (
          <Image key={i} source={{ uri: img.uri }} style={styles.thumb} />
        ))}
      </ScrollView>

      <Button title={t('runner.createTask')} onPress={() => void handleCreate()} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  hint: { color: colors.textSecondary, textAlign: 'center' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  locationBtn: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  locationText: { color: colors.primary, fontWeight: '500', textAlign: 'center' },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.sm },
  hScroll: { marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  addPhoto: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  addPhotoText: { color: colors.primary, fontWeight: '600' },
  thumb: { width: 72, height: 72, borderRadius: 8, marginRight: spacing.sm },
  walletHint: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  walletHintText: { fontSize: 14, fontWeight: '600', color: colors.text },
  feeText: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
