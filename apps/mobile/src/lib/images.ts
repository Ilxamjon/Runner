import { ALLOWED_IMAGE_MIME_TYPES } from '@runner/shared';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

export function normalizeImageMime(mime?: string | null, uri?: string): string {
  const raw = (mime ?? '').toLowerCase().trim();
  if (raw === 'image/jpg' || raw === 'image/jpeg') return 'image/jpeg';
  if (raw === 'image/png') return 'image/png';
  if (raw === 'image/webp') return 'image/webp';

  const path = (uri ?? '').toLowerCase().split('?')[0];
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const mime = normalizeImageMime(asset.mimeType, asset.uri);

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed');
  }

  return { ...asset, mimeType: mime };
}

export function buildStoragePath(userId: string, entityId: string, fileName: string): string {
  return `${userId}/${entityId}/${fileName}`;
}

/** Read a local image URI into ArrayBuffer (works with file:// and content:// on Android). */
export async function readUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return decode(base64);
}
