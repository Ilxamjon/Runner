-- Performance indexes and admin analytics views

CREATE INDEX IF NOT EXISTS idx_micro_tasks_open_created
  ON micro_tasks (created_at DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_applications_status_created
  ON applications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_escrow_status_created
  ON escrow_transactions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON messages (sender_id, created_at DESC);

-- Admin dashboard views (read via service role / SQL editor)

CREATE OR REPLACE VIEW admin_kpi_daily AS
SELECT
  current_date AS day,
  (SELECT count(*) FROM profiles WHERE created_at::date = current_date) AS new_users,
  (SELECT count(*) FROM vacancies WHERE created_at::date = current_date) AS new_vacancies,
  (SELECT count(*) FROM micro_tasks WHERE created_at::date = current_date) AS new_tasks,
  (SELECT count(*) FROM applications WHERE created_at::date = current_date) AS new_applications,
  (SELECT count(*) FROM escrow_transactions WHERE status = 'released' AND updated_at::date = current_date) AS releases_today,
  (SELECT count(*) FROM escrow_transactions WHERE status = 'disputed') AS open_disputes,
  (SELECT coalesce(sum(amount), 0) FROM escrow_transactions WHERE status = 'held') AS escrow_held_total,
  (SELECT coalesce(avg(extract(epoch FROM (accepted_at - created_at)) / 60.0), 0)
     FROM micro_tasks
     WHERE accepted_at IS NOT NULL
       AND created_at > now() - interval '7 days') AS avg_match_minutes_7d;

CREATE OR REPLACE VIEW admin_task_funnel AS
SELECT
  status,
  count(*) AS cnt
FROM micro_tasks
GROUP BY status
ORDER BY cnt DESC;

CREATE OR REPLACE VIEW admin_top_regions AS
SELECT
  r.name_uz,
  r.name_ru,
  count(mt.id) AS task_count
FROM regions r
LEFT JOIN micro_tasks mt ON mt.region_id = r.id
GROUP BY r.id, r.name_uz, r.name_ru
ORDER BY task_count DESC;
