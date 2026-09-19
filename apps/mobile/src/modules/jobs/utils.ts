import type { AppLocale, ExperienceLevel, Industry, Region, VacancyDetail } from '@runner/shared';

export function localizedName(
  item: { name_uz: string; name_ru: string } | null | undefined,
  locale: AppLocale,
): string {
  if (!item) return '';
  return locale === 'ru' ? item.name_ru : item.name_uz;
}

export function formatSalary(vacancy: VacancyDetail): string {
  if (!vacancy.is_salary_visible) return '—';
  if (!vacancy.salary_min && !vacancy.salary_max) return '—';
  const min = vacancy.salary_min?.toLocaleString() ?? '—';
  const max = vacancy.salary_max?.toLocaleString() ?? '—';
  return `${min} – ${max} ${vacancy.salary_currency}`;
}

export function parseSalaryInput(value: string): number | null {
  const num = parseInt(value.replace(/\D/g, ''), 10);
  return Number.isNaN(num) ? null : num;
}

export function getRegionLabel(regions: Region[], id: string | null, locale: AppLocale): string {
  if (!id) return '';
  const region = regions.find((r) => r.id === id);
  return localizedName(region, locale);
}

export function getIndustryLabel(industries: Industry[], id: string | null, locale: AppLocale): string {
  if (!id) return '';
  const industry = industries.find((i) => i.id === id);
  return localizedName(industry, locale);
}

export function experienceLabel(level: ExperienceLevel, t: (key: string) => string): string {
  return t(`resume.levels.${level}`);
}
