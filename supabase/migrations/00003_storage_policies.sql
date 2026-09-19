-- Runner: Storage buckets (images only)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'job-images',
    'job-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'task-images',
    'task-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'verification-docs',
    'verification-docs',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO NOTHING;

-- Avatars: user owns folder {user_id}/*
CREATE POLICY "avatars_select_public" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Job images: employer uploads to {user_id}/{vacancy_id}/*
CREATE POLICY "job_images_select" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'job-images');

CREATE POLICY "job_images_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "job_images_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Task images: employer uploads to {user_id}/{task_id}/*
CREATE POLICY "task_images_select" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'task-images');

CREATE POLICY "task_images_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "task_images_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Verification docs: private, owner only
CREATE POLICY "verification_docs_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "verification_docs_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
