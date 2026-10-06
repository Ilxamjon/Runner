import type {
  CreateMicroTaskInput,
  MicroTask,
  MicroTaskDetail,
  TaskStatus,
  TaskUrgency,
} from '@runner/shared';
import { STORAGE_BUCKETS } from '@runner/shared';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { buildStoragePath, normalizeImageMime, readUriAsArrayBuffer } from '@/lib/images';

export function parseLocation(geo: unknown): { lat: number; lng: number } {
  if (typeof geo === 'object' && geo !== null) {
    if ('coordinates' in geo) {
      const coords = (geo as { coordinates: [number, number] }).coordinates;
      return { lng: coords[0], lat: coords[1] };
    }
    if ('lat' in geo && 'lng' in geo) {
      return geo as { lat: number; lng: number };
    }
  }
  return { lat: 0, lng: 0 };
}

function mapTaskRow(row: Record<string, unknown>): MicroTask {
  return {
    ...(row as unknown as MicroTask),
    location: parseLocation(row.location),
  };
}

export async function fetchNearbyTasks(
  lat: number,
  lng: number,
  radiusMeters = 10000,
): Promise<MicroTask[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase.rpc('nearby_open_tasks', {
    lat,
    lng,
    radius_meters: radiusMeters,
  });

  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => mapTaskRow(row));
}

const TASK_SELECT = `
  *,
  category:task_categories(id, slug, name_uz, name_ru, sort_order),
  region:regions(id, name_uz, name_ru, sort_order),
  task_images(id, storage_path),
  task_assignments(runner_id, accepted_at)
`;

export async function fetchTaskById(id: string): Promise<MicroTaskDetail | null> {
  const { data, error } = await supabase
    .from('micro_tasks')
    .select(`${TASK_SELECT}, employer:profiles!micro_tasks_employer_id_fkey(full_name)`)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const raw = data as Record<string, unknown>;
  const assignments = raw.task_assignments as { runner_id: string; accepted_at: string }[] | null;
  const employer = raw.employer as { full_name?: string } | null;

  return {
    ...mapTaskRow(raw),
    category: raw.category as MicroTaskDetail['category'],
    region: raw.region as MicroTaskDetail['region'],
    task_images: raw.task_images as MicroTaskDetail['task_images'],
    assignment: assignments?.[0] ?? null,
    employer: employer ? { company_name: employer.full_name ?? '' } : null,
  };
}

export async function fetchTaskCategories() {
  const { data, error } = await supabase
    .from('task_categories')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function createTask(input: CreateMicroTaskInput): Promise<MicroTask> {
  const { data, error } = await supabase.rpc('create_micro_task', {
    p_title: input.title,
    p_description: input.description,
    p_lat: input.lat,
    p_lng: input.lng,
    p_price_amount: input.price_amount,
    p_category_id: input.category_id ?? null,
    p_address_text: input.address_text ?? null,
    p_region_id: input.region_id ?? null,
    p_urgency: input.urgency ?? 'normal',
    p_radius_meters: input.radius_meters ?? 5000,
  });

  if (error) throw error;
  return mapTaskRow(data as Record<string, unknown>);
}

export async function uploadTaskImage(
  userId: string,
  taskId: string,
  imageUri: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const contentType = normalizeImageMime(mimeType, imageUri);
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = buildStoragePath(userId, taskId, `${Date.now()}.${ext}`);

  const body = await readUriAsArrayBuffer(imageUri);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.taskImages)
    .upload(path, body, { contentType });

  if (uploadError) throw uploadError;

  const { error: dbError } = await supabase.from('task_images').insert({
    task_id: taskId,
    storage_path: path,
  });

  if (dbError) throw dbError;
  return path;
}

export function getTaskImageUrl(storagePath: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKETS.taskImages).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function acceptTask(taskId: string) {
  const { data, error } = await supabase.rpc('accept_micro_task', {
    p_micro_task_id: taskId,
  });

  if (error) throw error;
  return data;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const { error } = await supabase.rpc('transition_micro_task_status', {
    p_micro_task_id: taskId,
    p_new_status: status,
  });

  if (error) throw error;
}

export async function startTask(taskId: string) {
  await updateTaskStatus(taskId, 'in_progress');
}

export async function completeTask(taskId: string) {
  await updateTaskStatus(taskId, 'completed');
}

export async function cancelTask(taskId: string) {
  await updateTaskStatus(taskId, 'cancelled');
}

export async function fetchMyRunnerTasks(runnerId: string): Promise<MicroTaskDetail[]> {
  const { data: assignments, error: aErr } = await supabase
    .from('task_assignments')
    .select('task_id')
    .eq('runner_id', runnerId);

  if (aErr) throw aErr;
  if (!assignments?.length) return [];

  const taskIds = assignments.map((a) => a.task_id);
  const { data, error } = await supabase
    .from('micro_tasks')
    .select(TASK_SELECT)
    .in('id', taskIds)
    .in('status', ['accepted', 'in_progress', 'completed']);

  if (error) throw error;
  return (data ?? []).map((row) => mapTaskRow(row as Record<string, unknown>) as MicroTaskDetail);
}

export async function fetchMyEmployerTasks(employerId: string): Promise<MicroTaskDetail[]> {
  const { data, error } = await supabase
    .from('micro_tasks')
    .select(TASK_SELECT)
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapTaskRow(row as Record<string, unknown>) as MicroTaskDetail);
}

export async function updateRunnerLocation(lat: number, lng: number) {
  const { error } = await supabase.rpc('update_runner_location', { p_lat: lat, p_lng: lng });
  if (error) throw error;
}

export function subscribeToOpenTasks(onChange: () => void) {
  return supabase
    .channel('open-tasks')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'micro_tasks' },
      () => onChange(),
    )
    .subscribe();
}

export function subscribeToTask(taskId: string, onChange: () => void) {
  return supabase
    .channel(`task-${taskId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'micro_tasks', filter: `id=eq.${taskId}` },
      () => onChange(),
    )
    .subscribe();
}

export const URGENCY_LEVELS: TaskUrgency[] = ['normal', 'urgent', 'asap'];

export const ACTIVE_TASK_STATUSES: TaskStatus[] = ['accepted', 'in_progress', 'completed'];
