-- Trust layer: chat helpers, review uniqueness, rating aggregation

-- Allow participants to see other participants in same conversation
CREATE POLICY "conversation_participants_select_peers" ON conversation_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants me
      WHERE me.conversation_id = conversation_participants.conversation_id
        AND me.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION get_or_create_task_conversation(p_micro_task_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task micro_tasks;
  assignment task_assignments;
  conv_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO task FROM micro_tasks WHERE id = p_micro_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  SELECT * INTO assignment FROM task_assignments WHERE task_id = p_micro_task_id;

  IF task.employer_id <> auth.uid()
     AND (assignment.runner_id IS NULL OR assignment.runner_id <> auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF assignment.runner_id IS NULL THEN
    RAISE EXCEPTION 'No runner assigned yet';
  END IF;

  SELECT id INTO conv_id FROM conversations WHERE micro_task_id = p_micro_task_id;
  IF FOUND THEN
    RETURN conv_id;
  END IF;

  INSERT INTO conversations (micro_task_id) VALUES (p_micro_task_id)
  RETURNING id INTO conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id) VALUES
    (conv_id, task.employer_id),
    (conv_id, assignment.runner_id)
  ON CONFLICT DO NOTHING;

  RETURN conv_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_or_create_application_conversation(p_application_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app applications;
  vac vacancies;
  conv_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO app FROM applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  SELECT * INTO vac FROM vacancies WHERE id = app.vacancy_id;

  IF app.candidate_id <> auth.uid() AND vac.employer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id INTO conv_id FROM conversations WHERE vacancy_application_id = p_application_id;
  IF FOUND THEN
    RETURN conv_id;
  END IF;

  INSERT INTO conversations (vacancy_application_id) VALUES (p_application_id)
  RETURNING id INTO conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id) VALUES
    (conv_id, vac.employer_id),
    (conv_id, app.candidate_id)
  ON CONFLICT DO NOTHING;

  RETURN conv_id;
END;
$$;

CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
END;
$$;

-- One review per reviewer per task (or vacancy)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_task
  ON reviews (reviewer_id, micro_task_id)
  WHERE micro_task_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_vacancy
  ON reviews (reviewer_id, vacancy_id)
  WHERE vacancy_id IS NOT NULL;

CREATE OR REPLACE FUNCTION refresh_profile_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET
    rating_avg = coalesce((
      SELECT round(avg(rating)::numeric, 2) FROM reviews WHERE reviewee_id = NEW.reviewee_id
    ), 0),
    rating_count = (
      SELECT count(*)::int FROM reviews WHERE reviewee_id = NEW.reviewee_id
    ),
    updated_at = now()
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_reviews_rating ON reviews;
CREATE TRIGGER tr_reviews_rating
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_profile_rating();

CREATE OR REPLACE FUNCTION submit_task_review(
  p_micro_task_id UUID,
  p_rating SMALLINT,
  p_comment TEXT DEFAULT NULL
)
RETURNS reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task micro_tasks;
  assignment task_assignments;
  reviewee UUID;
  result reviews;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be 1-5';
  END IF;

  SELECT * INTO task FROM micro_tasks WHERE id = p_micro_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF task.status NOT IN ('completed', 'verified') THEN
    RAISE EXCEPTION 'Task not ready for review';
  END IF;

  SELECT * INTO assignment FROM task_assignments WHERE task_id = p_micro_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No assignment';
  END IF;

  IF auth.uid() = task.employer_id THEN
    reviewee := assignment.runner_id;
  ELSIF auth.uid() = assignment.runner_id THEN
    reviewee := task.employer_id;
  ELSE
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO reviews (reviewer_id, reviewee_id, micro_task_id, rating, comment)
  VALUES (auth.uid(), reviewee, p_micro_task_id, p_rating, p_comment)
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_task_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_application_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read TO authenticated;
GRANT EXECUTE ON FUNCTION submit_task_review TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
