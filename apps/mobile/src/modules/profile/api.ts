import type {
  CandidateProfile,
  EmployerProfile,
  ExperienceLevel,
  OnboardingData,
  Profile,
  RunnerProfile,
  UserRole,
} from '@runner/shared';
import { DEFAULT_USER_ROLES } from '@runner/shared';
import { supabase } from '@/lib/supabase';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'bio' | 'locale'>>,
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

/** Ensure profile has candidate + employer + runner capabilities. */
export async function ensureDefaultRoles(userId: string, fullName?: string): Promise<Profile | null> {
  const profile = await fetchProfile(userId);
  if (!profile) return null;

  const missing = DEFAULT_USER_ROLES.filter((role) => !profile.roles.includes(role));
  let next = profile;

  if (missing.length > 0) {
    const { data, error } = await supabase.rpc('ensure_default_roles');
    if (error) throw error;
    next = data as Profile;
  }

  const name = fullName?.trim() || profile.full_name || 'User';
  const [candidate, employer, runner] = await Promise.all([
    fetchCandidateProfile(userId),
    fetchEmployerProfile(userId),
    fetchRunnerProfile(userId),
  ]);

  await Promise.all([
    candidate ? Promise.resolve() : upsertCandidateProfile(userId, {}),
    employer ? Promise.resolve() : upsertEmployerProfile(userId, { company_name: name }),
    runner ? Promise.resolve() : upsertRunnerProfile(userId, { is_available: false }),
  ]);

  return next;
}

export async function completeOnboarding(userId: string, data: OnboardingData, locale: string) {
  const fullName = data.fullName.trim();
  const companyName = data.companyName?.trim() || fullName;

  const { data: profileData, error: profileError } = await supabase.rpc(
    'complete_profile_onboarding',
    {
      p_full_name: fullName,
      p_bio: data.bio?.trim() || null,
      p_locale: locale as Profile['locale'],
    },
  );
  if (profileError) throw profileError;
  const profile = profileData as Profile;

  await upsertCandidateProfile(userId, {
    headline: data.headline?.trim() || null,
  });

  await upsertEmployerProfile(userId, {
    company_name: companyName,
    description: data.companyDescription?.trim() || null,
  });

  await upsertRunnerProfile(userId, { is_available: false });

  return profile;
}

async function upsertRunnerProfile(
  userId: string,
  updates: Partial<Pick<RunnerProfile, 'is_available'>>,
) {
  const { data, error } = await supabase
    .from('runner_profiles')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select('user_id, is_available, completed_tasks, updated_at')
    .single();

  if (error) throw error;
  return data as RunnerProfile;
}

export async function fetchCandidateProfile(userId: string): Promise<CandidateProfile | null> {
  const { data, error } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as CandidateProfile | null;
}

export async function upsertCandidateProfile(
  userId: string,
  updates: Partial<
    Pick<
      CandidateProfile,
      'headline' | 'experience_years' | 'experience_level' | 'skills' | 'education' | 'work_history' | 'is_public'
    >
  >,
) {
  const { data, error } = await supabase
    .from('candidate_profiles')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data as CandidateProfile;
}

export async function fetchEmployerProfile(userId: string): Promise<EmployerProfile | null> {
  const { data, error } = await supabase
    .from('employer_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as EmployerProfile | null;
}

export async function upsertEmployerProfile(
  userId: string,
  updates: Partial<Pick<EmployerProfile, 'company_name' | 'description' | 'website'>>,
) {
  const { data, error } = await supabase
    .from('employer_profiles')
    .upsert({ user_id: userId, company_name: updates.company_name ?? '', ...updates }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data as EmployerProfile;
}

export async function fetchRunnerProfile(userId: string): Promise<RunnerProfile | null> {
  const { data, error } = await supabase
    .from('runner_profiles')
    .select('user_id, is_available, completed_tasks, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as RunnerProfile | null;
}

export async function setRunnerAvailability(userId: string, isAvailable: boolean) {
  const { data, error } = await supabase
    .from('runner_profiles')
    .upsert({ user_id: userId, is_available: isAvailable }, { onConflict: 'user_id' })
    .select('user_id, is_available, completed_tasks, updated_at')
    .single();

  if (error) throw error;
  return data as RunnerProfile;
}

export const EXPERIENCE_LEVELS: ExperienceLevel[] = ['none', 'junior', 'mid', 'senior'];
