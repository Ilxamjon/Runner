import type { AppLocale } from '@runner/shared';
import { useLocale } from '@/hooks/useLocale';
import { localizedName } from '@/modules/jobs/utils';

export function useLocalizedName() {
  const { locale } = useLocale();
  return (item: { name_uz: string; name_ru: string } | null | undefined) =>
    localizedName(item, locale as AppLocale);
}
