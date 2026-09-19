import { DEFAULT_LOCALE, translations } from '@runner/shared';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

void i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: flattenTranslations(translations.uz) },
    ru: { translation: flattenTranslations(translations.ru) },
  },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
});

function flattenTranslations(
  tree: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[path] = value;
    } else if (value && typeof value === 'object') {
      Object.assign(result, flattenTranslations(value as Record<string, unknown>, path));
    }
  }
  return result;
}

export default i18n;
