-- Production hardening phase 2:
-- enforce application and micro-task state machines in SECURITY DEFINER RPCs.

-- -----------------------------------------------------------------------------
-- Applications
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION transition_application_status(
  p_application_id UUID,
  p_new_status application_status
)
RETURNS applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app applications;
  vac vacancies;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO app
  FROM applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  SELECT * INTO vac
  FROM vacancies
  WHERE id = app.vacancy_id;

  IF auth.uid() = app.candidate_id THEN
    IF p_new_status <> 'withdrawn' THEN
      RAISE EXCEPTION 'Candidate can only withdraw an application';
    END IF;

    IF app.status IN ('hired', 'rejected', 'withdrawn') THEN
      RAISE EXCEPTION 'Application is already terminal';
    END IF;

  ELSIF auth.uid() = vac.employer_id THEN
    IF app.status = 'submitted' AND p_new_status NOT IN ('reviewed', 'rejected') THEN
      RAISE EXCEPTION 'Invalid application transition';
    ELSIF app.status = 'reviewed' AND p_new_status NOT IN ('interview', 'offered', 'rejected') THEN
      RAISE EXCEPTION 'Invalid application transition';
    ELSIF app.status = 'interview' AND p_new_status NOT IN ('offered', 'rejected') THEN
      RAISE EXCEPTION 'Invalid application transition';
    ELSIF app.status = 'offered' AND p_new_status NOT IN ('hired', 'rejected') THEN
      RAISE EXCEPTION 'Invalid application transition';
    ELSIF app.status IN ('hired', 'rejected', 'withdrawn') THEN
      RAISE EXCEPTION 'Application is already terminal';
    END IF;
  ELSE
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE applications
  SET status = p_new_status, updated_at = now()
  WHERE id = app.id
  RETURNING * INTO app;

  RETURN app;
END;
$$;

REVOKE UPDATE ON applications FROM authenticated;
REVOKE ALL ON FUNCTION transition_application_status(UUID, application_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION transition_application_status(UUID, application_status) TO authenticated;

-- -----------------------------------------------------------------------------
-- Runner task acceptance: assignment + status update must be atomic.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION accept_micro_task(p_micro_task_id UUID)
RETURNS task_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task micro_tasks;
  existing task_assignments;
  result task_assignments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role('runner') THEN
    RAISE EXCEPTION 'Runner role required';
  END IF;

  SELECT * INTO task
  FROM micro_tasks
  WHERE id = p_micro_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF task.employer_id = auth.uid() THEN
    RAISE EXCEPTION 'Employer cannot accept own task';
  END IF;

  IF task.status <> 'open' THEN
    RAISE EXCEPTION 'Task is not open';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM escrow_transactions
    WHERE micro_task_id = p_micro_task_id
      AND status = 'held'
  ) THEN
    RAISE EXCEPTION 'Task is not funded';
  END IF;

  SELECT * INTO existing
  FROM task_assignments
  WHERE task_id = p_micro_task_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Task is already assigned';
  END IF;

  INSERT INTO task_assignments (task_id, runner_id)
  VALUES (p_micro_task_id, auth.uid())
  RETURNING * INTO result;

  UPDATE micro_tasks
  SET status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE id = p_micro_task_id;

  RETURN result;
END;
$$;

-- -----------------------------------------------------------------------------
-- Task state transitions.
-- Runner: accepted -> in_progress -> completed
-- Employer: open -> cancelled, but only if no held escrow remains.
-- Verification is performed by escrow_release_for_task().
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION transition_micro_task_status(
  p_micro_task_id UUID,
  p_new_status task_status
)
RETURNS micro_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task micro_tasks;
  assignment task_assignments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO task
  FROM micro_tasks
  WHERE id = p_micro_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  SELECT * INTO assignment
  FROM task_assignments
  WHERE task_id = p_micro_task_id;

  IF auth.uid() = task.employer_id THEN
    IF task.status = 'open' AND p_new_status = 'cancelled' THEN
      IF EXISTS (
        SELECT 1 FROM escrow_transactions
        WHERE micro_task_id = p_micro_task_id
          AND status = 'held'
      ) THEN
        RAISE EXCEPTION 'Refund held escrow before cancelling';
      END IF;

      UPDATE micro_tasks
      SET status = 'cancelled', updated_at = now()
      WHERE id = task.id
      RETURNING * INTO task;

      RETURN task;
    END IF;

    RAISE EXCEPTION 'Invalid employer task transition';
  END IF;

  IF assignment.runner_id IS NULL OR assignment.runner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF task.status = 'accepted' AND p_new_status = 'in_progress' THEN
    UPDATE micro_tasks
    SET status = 'in_progress', updated_at = now()
    WHERE id = task.id
    RETURNING * INTO task;

    RETURN task;
  END IF;

  IF task.status = 'in_progress' AND p_new_status = 'completed' THEN
    UPDATE micro_tasks
    SET status = 'completed', completed_at = now(), updated_at = now()
    WHERE id = task.id
    RETURNING * INTO task;

    RETURN task;
  END IF;

  RAISE EXCEPTION 'Invalid runner task transition';
END;
$$;

REVOKE INSERT ON task_assignments FROM authenticated;
REVOKE UPDATE ON micro_tasks FROM authenticated;

REVOKE ALL ON FUNCTION accept_micro_task(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION transition_micro_task_status(UUID, task_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION accept_micro_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transition_micro_task_status(UUID, task_status) TO authenticated;
