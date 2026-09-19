import type { AppLocale, UserRole } from './types';

export const SUPPORTED_LOCALES: AppLocale[] = ['uz', 'ru'];

export const DEFAULT_LOCALE: AppLocale = 'uz';

/** Every signed-in user can post jobs, apply, and run micro-tasks. */
export const DEFAULT_USER_ROLES: UserRole[] = ['candidate', 'employer', 'runner'];

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  jobImages: 'job-images',
  taskImages: 'task-images',
  verificationDocs: 'verification-docs',
} as const;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_IMAGE_SIZE_BYTES = {
  avatar: 2 * 1024 * 1024,
  job: 5 * 1024 * 1024,
  task: 5 * 1024 * 1024,
} as const;

export const PLATFORM_FEE_PERCENT = 10;

export const DEFAULT_TASK_RADIUS_METERS = 5000;

export const DEFAULT_MAP_DELTA = {
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Tashkent default center for development
export const DEFAULT_MAP_CENTER = {
  latitude: 41.2995,
  longitude: 69.2401,
};

export const CURRENCY = {
  default: 'UZS',
  symbol: "so'm",
} as const;
