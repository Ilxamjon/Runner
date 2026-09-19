import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores';

export function useLocale() {
  const { t, i18n } = useTranslation();
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  const changeLocale = async (next: 'uz' | 'ru') => {
    setLocale(next);
    await i18n.changeLanguage(next);
  };

  return { t, locale, changeLocale };
}
