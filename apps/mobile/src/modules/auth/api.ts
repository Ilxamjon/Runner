import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const UZ_PHONE_REGEX = /^\+998\d{9}$/;

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('998') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9) return `+998${digits}`;
  if (input.startsWith('+998') && digits.length === 12) return `+${digits}`;
  return input.trim();
}

export function isValidUzPhone(phone: string): boolean {
  return UZ_PHONE_REGEX.test(normalizePhone(phone));
}

export async function sendPhoneOtp(phone: string) {
  if (!isSupabaseConfigured) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const normalized = normalizePhone(phone);
  if (!isValidUzPhone(normalized)) {
    throw new Error('INVALID_PHONE');
  }

  const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
  if (error) throw error;
  return normalized;
}

export async function verifyPhoneOtp(phone: string, token: string) {
  if (!isSupabaseConfigured) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const normalized = normalizePhone(phone);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token: token.trim(),
    type: 'sms',
  });

  if (error) throw error;

  if (data.user) {
    const { error: syncError } = await supabase.rpc('sync_verified_phone');
    if (syncError) throw syncError;
  }

  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
