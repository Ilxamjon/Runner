import type {
  Application,
  ApplicationStatus,
  ApplicationWithCandidate,
  CreateVacancyInput,
  Industry,
  Region,
  Vacancy,
  VacancyDetail,
  VacancyFilters,
  VacancyStatus,
} from '@runner/shared';
import { STORAGE_BUCKETS } from '@runner/shared';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { parseLocation } from '@/lib/geo';
import { buildStoragePath, normalizeImageMime, readUriAsArrayBuffer } from '@/lib/images';

const VACANCY_SELECT = `
  *,
  region:regions(id, name_uz, name_ru, sort_order),
  industry:industries(id, name_uz, name_ru, sort_order),
  vacancy_images(id, vacancy_id, storage_path, sort_order, created_at)
`;

function mapVacancyRow(row: Record<string, unknown>): VacancyDetail {
  const fromGeo = parseLocation(row.location);
  const latRaw = row.lat ?? fromGeo?.lat;
  const lngRaw = row.lng ?? fromGeo?.lng;
  const lat = typeof latRaw === 'number' ? latRaw : typeof latRaw === 'string' ? Number(latRaw) : NaN;
  const lng = typeof lngRaw === 'number' ? lngRaw : typeof lngRaw === 'string' ? Number(lngRaw) : NaN;
  const location =
    Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  return {
    ...(row as unknown as VacancyDetail),
    location,
  };
}

export async function fetchRegions(): Promise<Region[]> {
  const { data, error } = await supabase
    .from('regions')
    .select('id, name_uz, name_ru, sort_order')
    .order('sort_order');

  if (error) throw error;
  return (data ?? []) as Region[];
}

export async function fetchIndustries(): Promise<Industry[]> {
  const { data, error } = await supabase
    .from('industries')
    .select('id, name_uz, name_ru, sort_order')
    .order('sort_order');

  if (error) throw error;
  return (data ?? []) as Industry[];
}

export async function fetchVacancies(filters: VacancyFilters = {}): Promise<VacancyDetail[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('vacancies')
    .select(VACANCY_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (filters.regionId) query = query.eq('region_id', filters.regionId);
  if (filters.industryId) query = query.eq('industry_id', filters.industryId);
  if (filters.jobType) query = query.eq('job_type', filters.jobType);
  if (filters.experienceLevel) query = query.eq('experience_level', filters.experienceLevel);
  if (filters.salaryMin) query = query.gte('salary_max', filters.salaryMin);
  if (filters.salaryMax) query = query.lte('salary_min', filters.salaryMax);
  if (filters.query) query = query.textSearch('search_vector', filters.query);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapVacancyRow(row as Record<string, unknown>));
}

export async function fetchVacancyById(id: string): Promise<VacancyDetail | null> {
  const { data, error } = await supabase
    .from('vacancies')
    .select(VACANCY_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: employer } = await supabase
    .from('employer_profiles')
    .select('company_name')
    .eq('user_id', data.employer_id)
    .maybeSingle();

  return {
    ...mapVacancyRow(data as Record<string, unknown>),
    employer: employer ?? null,
  };
}

export async function fetchEmployerVacancies(employerId: string): Promise<VacancyDetail[]> {
  const { data, error } = await supabase
    .from('vacancies')
    .select(VACANCY_SELECT)
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapVacancyRow(row as Record<string, unknown>));
}

export async function setVacancyLocation(
  vacancyId: string,
  lat: number,
  lng: number,
  address?: string | null,
) {
  const { error } = await supabase.rpc('set_vacancy_location', {
    p_vacancy_id: vacancyId,
    p_lat: lat,
    p_lng: lng,
    p_address: address ?? null,
  });
  if (error) throw error;
}

export async function createVacancy(employerId: string, input: CreateVacancyInput): Promise<Vacancy> {
  const { data, error } = await supabase
    .from('vacancies')
    .insert({
      employer_id: employerId,
      title: input.title,
      description: input.description,
      industry_id: input.industry_id ?? null,
      region_id: input.region_id ?? null,
      job_type: input.job_type,
      experience_level: input.experience_level,
      salary_min: input.salary_min ?? null,
      salary_max: input.salary_max ?? null,
      is_salary_visible: input.is_salary_visible ?? true,
      address_text: input.address_text ?? null,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  if (input.location) {
    await setVacancyLocation(
      data.id,
      input.location.lat,
      input.location.lng,
      input.address_text,
    );
  }

  return mapVacancyRow(data as Record<string, unknown>) as Vacancy;
}

export async function updateVacancy(
  vacancyId: string,
  input: Partial<CreateVacancyInput> & { status?: VacancyStatus },
): Promise<Vacancy> {
  const { location, address_text, ...rest } = input;
  const updates: Record<string, unknown> = { ...rest };
  if (address_text !== undefined) updates.address_text = address_text;
  if (input.status === 'published') {
    updates.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('vacancies')
    .update(updates)
    .eq('id', vacancyId)
    .select()
    .single();

  if (error) throw error;

  if (location) {
    await setVacancyLocation(vacancyId, location.lat, location.lng, address_text);
  }

  return mapVacancyRow(data as Record<string, unknown>) as Vacancy;
}

export async function deleteVacancy(vacancyId: string) {
  const { error } = await supabase.from('vacancies').delete().eq('id', vacancyId);
  if (error) throw error;
}

export async function uploadVacancyImage(
  userId: string,
  vacancyId: string,
  imageUri: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const contentType = normalizeImageMime(mimeType, imageUri);
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const fileName = `${Date.now()}.${ext}`;
  const path = buildStoragePath(userId, vacancyId, fileName);

  const body = await readUriAsArrayBuffer(imageUri);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.jobImages)
    .upload(path, body, { contentType, upsert: false });

  if (uploadError) throw uploadError;

  const { error: dbError } = await supabase.from('vacancy_images').insert({
    vacancy_id: vacancyId,
    storage_path: path,
  });

  if (dbError) throw dbError;
  return path;
}

export function getVacancyImageUrl(storagePath: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKETS.jobImages).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function applyToVacancy(vacancyId: string, coverLetter?: string): Promise<Application> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('applications')
    .insert({
      vacancy_id: vacancyId,
      candidate_id: user.id,
      cover_letter: coverLetter ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Application;
}

export async function fetchMyApplication(vacancyId: string): Promise<Application | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('vacancy_id', vacancyId)
    .eq('candidate_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data as Application | null;
}

export async function withdrawApplication(applicationId: string) {
  const { error } = await supabase.rpc('transition_application_status', {
    p_application_id: applicationId,
    p_new_status: 'withdrawn',
  });

  if (error) throw error;
}

export async function fetchVacancyApplications(vacancyId: string): Promise<ApplicationWithCandidate[]> {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      candidate:profiles!applications_candidate_id_fkey(
        id, full_name, phone, avatar_url,
        candidate_profiles(headline, experience_level, skills)
      )
    `)
    .eq('vacancy_id', vacancyId)
    .neq('status', 'withdrawn')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ApplicationWithCandidate[];
}

export async function updateApplicationStatus(applicationId: string, status: ApplicationStatus) {
  const { error } = await supabase.rpc('transition_application_status', {
    p_application_id: applicationId,
    p_new_status: status,
  });

  if (error) throw error;
}

export function subscribeToApplications(
  vacancyId: string,
  onChange: () => void,
) {
  return supabase
    .channel(`applications-${vacancyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'applications', filter: `vacancy_id=eq.${vacancyId}` },
      () => onChange(),
    )
    .subscribe();
}

export const JOB_TYPES = ['permanent', 'temporary', 'contract'] as const;
export const EXPERIENCE_LEVELS = ['none', 'junior', 'mid', 'senior'] as const;
export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'submitted', 'reviewed', 'interview', 'offered', 'hired', 'rejected',
];
