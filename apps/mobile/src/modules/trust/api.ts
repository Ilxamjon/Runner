import type { Review, ReviewWithReviewer, Verification, VerificationType } from '@runner/shared';
import { STORAGE_BUCKETS } from '@runner/shared';
import { supabase } from '@/lib/supabase';
import { buildStoragePath, normalizeImageMime, readUriAsArrayBuffer } from '@/lib/images';

export async function submitTaskReview(
  taskId: string,
  rating: number,
  comment?: string,
): Promise<Review> {
  const { data, error } = await supabase.rpc('submit_task_review', {
    p_micro_task_id: taskId,
    p_rating: rating,
    p_comment: comment ?? null,
  });
  if (error) throw error;
  return data as Review;
}

export async function fetchMyReviewForTask(taskId: string, userId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('micro_task_id', taskId)
    .eq('reviewer_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as Review | null;
}

export async function fetchReviewsForUser(userId: string): Promise<ReviewWithReviewer[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, avatar_url)')
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data ?? []) as ReviewWithReviewer[];
}

export async function fetchMyVerifications(userId: string): Promise<Verification[]> {
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Verification[];
}

export async function submitIdentityVerification(
  userId: string,
  imageUri: string,
  mimeType = 'image/jpeg',
  type: VerificationType = 'identity',
): Promise<Verification> {
  const contentType = normalizeImageMime(mimeType, imageUri);
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = buildStoragePath(userId, type, `${Date.now()}.${ext}`);

  const body = await readUriAsArrayBuffer(imageUri);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.verificationDocs)
    .upload(path, body, { contentType });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('verifications')
    .insert({
      user_id: userId,
      type,
      status: 'pending',
      document_url: path,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Verification;
}
